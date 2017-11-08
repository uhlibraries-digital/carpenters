import { Injectable, EventEmitter, Output } from '@angular/core';

import { LocalStorageService } from './local-storage.service';

@Injectable()
export class PreferencesService {

  data: any;
  new: boolean = false;

  @Output() preferencesChange: EventEmitter<any> = new EventEmitter<any>();

  constructor(private storage: LocalStorageService) {
    this.load();
  }

  load(): any {
    this.data = this.storage.get('preferences');
    if ((typeof this.data) !== 'object' || !this.data) {
      this.data = this.loadDefault();
    }
    this.preferencesChange.emit(this.data);
    return this.data;
  }

  setByKey(key: string, value: any): void {
    this.new = false;
    let [cat, what] = key.split('.');
    if (this.data[cat] && this.data[cat][what]) {
      this.data[cat][what] = value;
      this.storage.set('preferences', this.data);
      this.preferencesChange.emit(this.data);
    }
  }

  set(data: any): void {
    this.new = false;
    this.data = data;
    this.storage.set('preferences', this.data);
    this.preferencesChange.emit(this.data);
  }

  private loadDefault(): any {
    this.new = true;
    return {
      'archivesspace': {
        'frontend': '',
        'endpoint': '',
        'username': '',
        'password': ''
      },
      'map': {
        'archival': '',
        'full': ''
      },
      'minter': {
        'endpoint': '',
        'prefix': '',
        'key': '',
        'ercWho': '',
        'ercWhere': ''
      }
    };
  }


}
