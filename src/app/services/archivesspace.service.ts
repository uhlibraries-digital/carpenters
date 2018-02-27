import { Injectable, EventEmitter }    from '@angular/core';
import { Headers, Http, RequestOptions, URLSearchParams } from '@angular/http';
import { v4 } from 'uuid';

import 'rxjs/add/operator/toPromise';

import { PreferencesService } from './preferences.service';
import { SessionStorageService } from './session-storage.service';

@Injectable()
export class ArchivesSpaceService {

  private preferences: any;
  private storageKey: string = 'archivesspace';

  public selectedResource: any;
  public itemIndicator: number;

  selectedResourceChanged: EventEmitter<any> = new EventEmitter();
  selectedArchivalObjectsChanged: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private preferenceService: PreferencesService,
    private sessionStorage: SessionStorageService,
    private http: Http) {

    this.preferenceService.preferencesChange.subscribe((data) => {
      this.preferences = data;
    });
    this.preferences = this.preferenceService.data;
  }

  clear(): void {
    this.selectedResource = undefined;
    this.selectedResourceChanged.emit(this.selectedResource);
  }

  getRepositories(): Promise<any> {
    return this.request('/repositories');
  }

  getResources(repositoryUri: string, page: number = 1, prevResults?: any): Promise<any> {
    let url = repositoryUri + '/resources';
    return this.request(url, {
      page_size: 100,
      page: page
    }).then((result) => {
      /* NEED TO FIGURE OUT WHAT TO DO WITH MORE THAN 100 RESOURCES */
      if (prevResults) {
        result.results = result.results.concat(prevResults.results);
      }
      if (result.this_page < result.last_page) {
        return this.getResources(repositoryUri, result.this_page + 1, result);
      }
      else {
        return result;
      }
    });
  }

  getResource(uri: string): Promise<any> {
    return this.request(uri)
      .then(resource => this.selectedResource = resource)
      .then((resource) => {
        this.setCollectionTitle();
        return this.getResourceTree(uri).then((tree) => {
          this.selectedResource.tree = tree;
          this.selectedResourceChanged.emit(this.selectedResource);
        });
      });
  }

  getResourceTree(uri: string): Promise<any> {
    return this.request(uri + '/tree')
      .then((tree) => {
        this.itemIndicator = 1;
        this.populateChildAttributes(tree.children);
        return tree;
      });
  }

  getArchivalObject(uri: string): Promise<any> {
    return this.request(uri);
  }

  setSelectedResource(resource: any): void {
    this.selectedResource = resource;
    this.selectedResourceChanged.emit(resource);
  }

  request(uri: string, params?: any): Promise<any> {
    if (!this.preferences.archivesspace) {
      return Promise.reject('Preferences are not set');
    }

    let today = new Date();
    let session = this.sessionStorage.get(this.storageKey);

    if (!session.expires || session.expires <= today.getTime()) {
      return this.login(this.preferences.archivesspace.username, this.preferences.archivesspace.password)
        .then((session) => {
          return this._request(uri, params, session);
        });
    }
    else {
      return this._request(uri, params);
    }
  }

  post(uri: string, params: any = '', encode: boolean = false): Promise<any> {
    if (!this.preferences.archivesspace) {
      return Promise.reject('Preferences are not set');
    }

    let today = new Date();
    let session = this.sessionStorage.get(this.storageKey);

    if (!session.expires || session.expires <= today.getTime()) {
      return this.login(this.preferences.archivesspace.username, this.preferences.archivesspace.password)
        .then((session) => {
          return this._post(uri, params, encode, session);
        });
    }
    else {
      return this._post(uri, params, encode);
    }
  }

  clearSession(): void {
    this.sessionStorage.remove(this.storageKey);
  }

  displayContainer(c: any): string {
    let title: string = '';
    if (c.containers.length > 0) {
      let container = c.containers[0];
      if (container.type_1) {
        title += container.type_1 + ': ' + container.indicator_1;
      }
      if (container.type_2) {
        title += ', ' + container.type_2 + ': ' + container.indicator_2;
      }
      if (container.type_3) {
        title += ', ' + container.type_3 + ': ' + container.indicator_3;
      }
    }
    return title.replace('_', ' ');
  }

  parentsToString(c: any): string {
    return this.parentsToStringArray(c).join('|');
  }

  parentsToStringArray(c: any): string[] {
    let parents = this.parentsToArray(c);
    return parents.map(function(e) {
      return e.title;
    });
  }

  parentsToArray(c: any): any[] {
    if (c.parent) {
      let list = this.parentsToArray(c.parent);
      list.push(c.parent);
      return list;
    }
    return [];
  }

  selectedArchivalObjects(returnOnly: boolean = false): any[] {
    if (!this.selectedResource) {
      this.selectedArchivalObjectsChanged.emit([]);
      return [];
    }

    let list = this.selectedArchivalObject(this.selectedResource.tree.children);
    if (!returnOnly) {
      this.selectedArchivalObjectsChanged.emit(list);
    }
    return list;
  }

  padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  isSeriesType(level: string) {
    if (!level) { return false; }
    level = level.toLowerCase()
    return level === 'series' ||
      level === 'subseries' || level.indexOf('sub-series') > -1;
  }

  commitArtificialItems(): Promise<any> {
    let artificialItems = this.selectedArchivalObject(this.selectedResource.tree.children)
      .filter((object) => {
        return object.artificial && object.parent_uri;
      });
    let promises = [];
    for (let item of artificialItems) {
      promises.push(this.createArchivalObject(item)
        .then((data) => {
          item.record_uri = data.uri;
          item.id = data.id;
          item.artificial = false;
          item.parent_uri = null;
        }));
    }
    return Promise.all(promises);
  }

  private _request(uri: string, params?: any, session?: any): Promise<any> {
    if (!session) {
      session = this.sessionStorage.get(this.storageKey);
    }

    let searchParams = new URLSearchParams();
    if (params) {
      for (let key in params) {
        searchParams.set(key, params[key]);
      }
    }

    let headers = new Headers({ 'X-ArchivesSpace-Session': session.id });
    let options = new RequestOptions({
      headers: headers,
      search: searchParams
    });
    let url = this.preferences.archivesspace.endpoint + uri;

    return this.http.get(url, options)
      .toPromise()
      .then(response => response.json())
      .catch((error) => {
        return this.handleError(error);
      });
  }

  private _post(uri: string, params: any = '', encode: boolean = false, session?: any): Promise<any> {
    if (!session) {
      session = this.sessionStorage.get(this.storageKey);
    }

    let headers = new Headers({ 'X-ArchivesSpace-Session': session.id });
    let options = new RequestOptions({
      headers: headers
    });
    let url = this.preferences.archivesspace.endpoint + uri;

    let body = new URLSearchParams();
    if (params) {
      for (let key in params) {
        body.set(key, params[key]);
      }
    }

    return this.http.post(url, (encode ? body : params), options)
      .toPromise()
      .then((resonse) => {
        let data = resonse.json();
        return data;
      })
      .catch((error) => {
        return this.handleError(error);
      });
  }

  private login(username: string, password: string): Promise<any> {
    if (username === '' || password === '') {
      return Promise.reject('Missing username/password for ArchivesSpace');
    }
    if (this.preferences.archivesspace.endpoint === '') {
      return Promise.reject('Missing ArchivesSpace endpoint');
    }

    let body = 'password=' + encodeURIComponent(password);
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let options = new RequestOptions({ headers: headers });
    let url = this.preferences.archivesspace.endpoint + '/users/' + username + '/login';

    return this.http.post(url, body, options)
      .toPromise()
      .then((response) => {
        let data = response.json();
        let date = new Date();
        let session = {
          'id': data.session,
          'expires': date.getTime() + (3600 * 1000)
        };
        this.sessionStorage.set(this.storageKey, session);
        return session;
      })
      .catch((error) => {
        return this.handleError(error);
      });
  }

  private handleError(error: any): Promise<any> {
    try {
      let response = JSON.parse(error._body);
      error = response.error;
    }
    catch(e) { }
    return Promise.reject(error);
  }

  private populateChildAttributes(children: any[], parent?: any): void {
    let series_index = 1;
    for (let c of children) {
      c.uuid = v4();
      c.parent = parent;
      if (this.isSeriesType(c.level)) {
        c.series_index = series_index++;
      }
      this.populateDatesAndContainers(c);
      this.populateChildAttributes(c.children, c);
    }
  }

  private selectedArchivalObject(children: any[]): any[] {
    let list = [];
    for (let c of children) {
      list = list.concat(this.selectedArchivalObject(c.children));
      if (c.selected) {
        list.push(c);
      }
    }
    return list;
  }

  private populateDatesAndContainers(child: any): void {
    if ((child.node_type !== "archival_object" || child.instance_types.length === 0) && child.level !== 'item') {
      return;
    }

    let itemNumber: number = 0;
    if (child.level === 'item') {
      itemNumber = this.itemIndicator++;
    }

    child.containersLoading = true;
    this._request(child.record_uri).then((object) => {
      child.containers = [];
      child.dates = object.dates.filter(d => d.begin || d.end);
      child.instances = object.instances || [];
      let object_containers = object.instances.filter(instance => instance.sub_container && instance.sub_container.top_container);

      if (child.level === 'item' && object_containers.length === 0) {
        child.containers.push({
          'type_1': 'Item',
          'indicator_1': itemNumber,
          'type_2': null,
          'indicator_2': null,
          'type_3': null,
          'indicator_3': null
        });
      }

      let containerPromises = [];
      for (let c of object_containers) {
        containerPromises.push(this._request(c.sub_container.top_container.ref).then((topContainer) => {
          child.containers.push({
            'top_container': { 'ref': topContainer.uri || null },
            'type_1': topContainer.type || null,
            'indicator_1': topContainer.indicator || null,
            'type_2': c.sub_container.type_2 || null,
            'indicator_2': c.sub_container.indicator_2 || null,
            'type_3': c.sub_container.type_3 || null,
            'indicator_3': c.sub_container.indicator_3 || null
          });
        }));
      }
      Promise.all(containerPromises).then(() => { child.containersLoading = false; });
    });
  }

  private createArchivalObject(item: any): Promise<any> {
    let ao = {
      jsonmodel_type: "archival_object",
      parent: {
        ref: item.parent_uri
      },
      resource: {
        ref: this.selectedResource.tree.record_uri
      },
      title: item.title,
      level: "item",
      publish: false,
      restructions_apply: false,
      external_ids: [],
      subjects: [],
      extents: [],
      dates: [],
      external_documents: [],
      rights_statments: [],
      linked_agents: [],
      ancestors: [],
      instances: this.containerInstances(item),
      notes: [],
      linked_events: [],
      component_id: ""
    }

    return this.post(this.selectedResource.repository.ref + '/archival_objects', ao)
      .then((response) => {
        if (response.status !== 'Created') {
          throw Error("Unable to create archival object '" + item.title + "'");
        }
        let query = {
          "children[]": response.uri,
          "position": this.whereAmI(item)
        };
        this.post(item.parent_uri + '/accept_children', query, true);
        return response;
      });
  }

  private whereAmI(item: any): number {
    if (!item.parent) { return 0; }
    return item.parent.children.findIndex((object) => {
      return object.uuid === item.uuid;
    });
  }

  private containerInstances(obj: any): any {
    let instances = [];
    for (let container of obj.containers) {
      if (!container.top_container && obj.parent) {
        let ptc = this.findTopContainers(obj.parent);
        if (ptc.length > 0) {
          /* just going to grab the first top container */
          container.top_container = ptc[0].sub_container.top_container;
        }
      }

      let sub_container = {
        top_container: container.top_container
      }
      if (container.type_2) {
        sub_container['type_2'] = container.type_2;
        sub_container['indicator_2'] = String(container.indicator_2);
      }
      if (container.type_3) {
        sub_container['type_3'] = container.type_3;
        sub_container['indicator_3'] = String(container.indicator_3);
      }
      instances.push({
        instance_type: 'mixed_materials',
        sub_container: sub_container
      })
    }
    return instances;
  }

  private findTopContainers(object: any): any {
    if (!object.instances) { return []; }
    return object.instances.filter(instance => instance.sub_container && instance.sub_container.top_container);
  }

  private setCollectionTitle(): string {
    let ark = this.getArkFromExternalDocuments();
    if (!ark) {
      this.selectedResource.vocabTitle = this.selectedResource.title;
      return this.selectedResource.title
    }

    this.http.get(ark + '.rdf')
      .toPromise()
      .then((data) => {
        try {
          let parser = new DOMParser();
          let xml = parser.parseFromString(data['_body'], "text/xml");
          let prefLabels = xml.getElementsByTagName('prefLabel');
          this.selectedResource.vocabTitle = prefLabels[prefLabels.length - 1].textContent;
        }
        catch(e) {
          this.selectedResource.vocabTitle = this.selectedResource.title;
        }
      })
      .catch((error) => {
        this.selectedResource.vocabTitle = this.selectedResource.title;
      });

  }

  private getArkFromExternalDocuments(): string {
    this.selectedResource.collectionArkUrl = '';
    this.selectedResource.collectionArk = '';

    if (!this.selectedResource.external_documents) {
      return '';
    }

    let found;
    for (let edoc of this.selectedResource.external_documents) {
      if (edoc.location && (found = edoc.location.match(/ark:\/\d+\/.*$/))) {
        this.selectedResource.collectionArkUrl = edoc.location;
        this.selectedResource.collectionArk = found[0];
        return edoc.location;
      }
    }

    return '';
  }

}
