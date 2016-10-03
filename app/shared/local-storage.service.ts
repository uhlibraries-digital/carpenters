import { Injectable }    from '@angular/core';

@Injectable()
export class LocalStorageService {

  private localStorage: any;

  constructor() {
    this.localStorage = localStorage;
  }

  set(key: string, value: any): void {
    if (typeof value === 'object') {
      this.setObject(key, value);
    }
    else {
      this.localStorage[key] = value;
    }
  }

  get(key:string): any {
    let value: any;
    try {
      value = JSON.parse(this.localStorage[key]);
    }
    catch(e) {
      value = this.localStorage[key] || {};
    }
    return value;
  }

  setObject(key: string, value:any): void {
    this.localStorage[key] = JSON.stringify(value);
  }

  getObject(key: string): any {
    return JSON.parse(this.localStorage[key] || '{}');
  }

  remove(key:string): void {
    this.localStorage.removeItem(key);
  }

}
