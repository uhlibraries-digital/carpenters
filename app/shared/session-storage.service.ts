import { Injectable } from '@angular/core';

@Injectable()
export class SessionStorageService {

  private sessionStorage: any;

  constructor() {
    this.sessionStorage = sessionStorage;
  }

  set(key: string, value: any): void {
    if (typeof value === 'object') {
      this.setObject(key, value);
    }
    else {
      this.sessionStorage[key] = value;
    }
  }

  get(key:string): any {
    let value: any;
    try {
      value = JSON.parse(this.sessionStorage[key]);
    }
    catch(e) {
      value = this.sessionStorage[key] || {};
    }
    return value;
  }

  setObject(key: string, value:any): void {
    this.sessionStorage[key] = JSON.stringify(value);
  }

  getObject(key: string): any {
    return JSON.parse(this.sessionStorage[key] || '{}');
  }

  remove(key:string): void {
    this.sessionStorage.removeItem(key);
  }


}
