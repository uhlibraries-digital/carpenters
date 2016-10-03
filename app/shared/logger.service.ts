import { Injectable, Output, EventEmitter } from '@angular/core';

import { Entry } from './entry';

@Injectable()
export class LoggerService {

  entries: Entry[] = [];

  @Output() log:EventEmitter<any> = new EventEmitter();

  info(message: string): void {
    this.addEntry('info', message);
  }

  success(message: string): void {
    this.addEntry('success', message);
  }

  error(message: string): void {
    this.addEntry('error', message);
  }

  warn(message: string): void {
    this.addEntry('warning', message);
  }

  addEntry(type: string, message: string): void {
    this.entries.push(new Entry(type, message));
    this.log.emit(this.entries);
  }

  clear(): void {
    this.entries = [];
    this.log.emit(this.entries);
  }

  toString(): string {
    let output: string = '';
    for (let e of this.entries) {
      output += '[' + e.timestamp + '] ' + e.message + "\n";
    }
    return output;
  }

}
