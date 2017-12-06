import { Injectable, EventEmitter } from '@angular/core';
import { watchFile } from 'fs';
import { basename } from 'path';

@Injectable()
export class WatchService {

  filename: string;

  projectChanged: EventEmitter<any> = new EventEmitter();

  public projectFile(projectFilename: string) {
    this.filename = projectFilename;
    watchFile(projectFilename, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.projectChanged.emit(this.filename);
      }
    });
  }

}
