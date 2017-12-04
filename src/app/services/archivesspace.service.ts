import { Injectable, Output, EventEmitter }    from '@angular/core';
import { Headers, Http, RequestOptions, URLSearchParams } from '@angular/http';

import 'rxjs/add/operator/toPromise';

import { PreferencesService } from './preferences.service';
import { SessionStorageService } from './session-storage.service';

@Injectable()
export class ArchivesSpaceService {

  private preferences: any;
  private storageKey: string = 'archivesspace';

  public selectedResource: any;

  @Output() selectedResourceChanged: EventEmitter<any> = new EventEmitter();
  @Output() selectedArchivalObjectsChanged: EventEmitter<any> = new EventEmitter<any>();

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
        return this.getResourceTree(uri).then((tree) => {
          this.selectedResource.tree = tree;
          this.selectedResourceChanged.emit(this.selectedResource);
        });
      });
  }

  getResourceTree(uri: string): Promise<any> {
    return this.request(uri + '/tree')
      .then((tree) => {
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

  selectedArchivalObjects(): any[] {
    if (!this.selectedResource) {
      this.selectedArchivalObjectsChanged.emit([]);
      return [];
    }

    let list = this.selectedArchivalObject(this.selectedResource.tree.children);
    this.selectedArchivalObjectsChanged.emit(list);
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
      c.parent = parent;
      if (this.isSeriesType(c.level)) {
        c.series_index = series_index++;
      }
      this.populateContainers(c);
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

  private populateContainers(child: any): void {
    if (child.node_type !== "archival_object" || child.instance_types.length === 0) {
      return;
    }

    this._request(child.record_uri).then((object) => {
      if (!object.instances) {
        return;
      }
      let object_containers = object.instances.filter(instance => instance.sub_container && instance.sub_container.top_container);
      for (let c of object_containers) {
        this._request(c.sub_container.top_container.ref).then((topContainer) => {
          child.containers.push({
            'type_1': topContainer.type || '',
            'indicator_1': topContainer.indicator || '',
            'type_2': c.sub_container.type_2 || '',
            'indicator_2': c.sub_container.indicator_2 || '',
            'type_3': c.sub_container.type_3 || '',
            'indicator_3': c.sub_container.indicator_3 || ''
          });
        });
      }
    });
  }

}
