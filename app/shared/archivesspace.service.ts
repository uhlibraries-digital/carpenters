import { Injectable, Output, EventEmitter }    from '@angular/core';
import { Headers, Http, RequestOptions, URLSearchParams } from '@angular/http';

import 'rxjs/add/operator/toPromise';

import { LocalStorageService } from './local-storage.service';
import { SessionStorageService } from './session-storage.service';

@Injectable()
export class ArchivesSpaceService {

  private preferences: any;
  private storageKey: string = 'archivesspace';

  public selectedResource: any;

  @Output() selectedResourceChanged: EventEmitter<any> = new EventEmitter();

  constructor(
    private storage: LocalStorageService,
    private sessionStorage: SessionStorageService,
    private http: Http) {
    this.storage.changed.subscribe(key => {
      if (key === 'preferences') {
        this.loadPreferences();
      }
    });
    this.loadPreferences();
  }

  getRepositories(): Promise<any> {
    return this.request('/repositories');
  }

  getResources(repositoryUri: string, page: number = 1): Promise<any> {
    let url = repositoryUri + '/resources';
    return this.request(url, {
      page_size: 100,
      page: page
    }).then((result) => {
      /* NEED TO FIGURE OUT WHAT TO DO WITH MORE THAN 100 RESOURCES */
      if (result.this_page < result.last_page) {
        return this.getResources(repositoryUri, result.this_page + 1);
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
          console.log(this.selectedResource);
          this.selectedResourceChanged.emit(this.selectedResource);
        });
      });
  }

  getResourceTree(uri: string): Promise<any> {
    return this.request(uri + '/tree')
      .then((tree) => {
        this.createParentChild(tree.children);
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
    if (!this.preferences) {
      return Promise.reject('Preferences are not set');
    }

    let today = new Date();
    let session = this.sessionStorage.get(this.storageKey);

    if (!session.expires || session.expires <= today.getTime()) {
      return this.login(this.preferences.username, this.preferences.password)
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
      return [];
    }

    return this.selectedArchivalObject(this.selectedResource.tree.children);
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
    let url = this.preferences.endpoint + uri;

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
    if (this.preferences.endpoint === '') {
      return Promise.reject('Missing ArchivesSpace endpoint');
    }

    let body = 'password=' + password;
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let options = new RequestOptions({ headers: headers });
    let url = this.preferences.endpoint + '/users/' + username + '/login';

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

  private createParentChild(children: any[], parent?: any): void {
    for (let c of children) {
      c.parent = parent;
      this.createParentChild(c.children, c);
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

  private loadPreferences(): boolean {
    let preferences = this.storage.get('preferences');
    if (!preferences) {
      return false;
    }
    this.preferences = preferences.archivesspace;
    return true;
  }


}
