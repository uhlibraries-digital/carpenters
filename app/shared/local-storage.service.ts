import { Injectable, Output, EventEmitter }    from '@angular/core';
import { createCipher, createDecipher } from 'crypto';
import { existsSync, readFileSync, writeFile } from 'fs';
import { create } from 'random-seed';
import { remote } from 'electron';
let { app } = remote;

@Injectable()
export class LocalStorageService {

  private localStorage: any;
  private cw: string;
  private algorithm: string = 'aes-256-ctr';

  @Output() changed: EventEmitter<string> = new EventEmitter();

  constructor() {
    this.localStorage = localStorage;
    this.setupCrypto();
  }

  set(key: string, value: any): void {
    if (typeof value === 'object') {
      this.setObject(key, value);
    }
    else {
      this.localStorage[key] = this.encrypt(value);
    }
    this.changed.emit(key);
  }

  get(key:string): any {
    let value: any;
    try {
      value = JSON.parse(this.decrypt(this.localStorage[key]));
    }
    catch(e) {
      value = this.decrypt(this.localStorage[key]) || {};
    }
    return value;
  }

  setObject(key: string, value:any): void {
    this.localStorage[key] = this.encrypt(JSON.stringify(value));
  }

  getObject(key: string): any {
    return JSON.parse(this.decrypt(this.localStorage[key]) || '{}');
  }

  remove(key:string): void {
    this.localStorage.removeItem(key);
  }

  private setupCrypto(): void {
    let filename = app.getPath('userData') + '/cw';
    if (existsSync(filename)) {
      this.cw = String(readFileSync(filename));
    }
    else {
      this.cw = this.createCipherPassword();
      writeFile(filename, this.cw, (err) => {
        if (err) {
          console.error(err);
        }
      });
    }
  }

  private createCipherPassword(): string {
    let gen = create();
    let cwLength = Math.floor(gen.random() * 128) + 40;
    let securityString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+;:?/><,.';
    let cw = '';

    for ( let i = 0; i < cwLength; i++ ) {
      cw += securityString.charAt(Math.floor(gen.random() * securityString.length));
    }
    return cw;
  }

  private encrypt(text: string): string {
    let cipher = createCipher(this.algorithm, this.cw);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  }

  private decrypt(text: string): string {
    if (!text) {
      return null;
    }

    let decipher = createDecipher(this.algorithm, this.cw);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }

}
