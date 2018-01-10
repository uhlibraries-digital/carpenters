import { Injectable, EventEmitter } from '@angular/core';
import { watchFile, watch, existsSync } from 'fs';
import { basename } from 'path';

@Injectable()
export class WatchService {

  filename: string;

  projectChanged: EventEmitter<any> = new EventEmitter();
  hierarchyChanged: EventEmitter<any> = new EventEmitter();

  public projectFile(projectFilename: string) {
    this.filename = projectFilename;
    watchFile(projectFilename, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.projectChanged.emit(this.filename);
      }
    });
  }

  public fileHierarchy(projectFilesPath: string) {
    if (!existsSync(projectFilesPath)) return;

    this.hierarchyChanged.emit(projectFilesPath);
    watch(projectFilesPath, { recursive: true }, (eventType, filename) => {
      console.log('watch eventType', eventType, 'filename', filename);
      if (eventType === 'rename') {
        this.hierarchyChanged.emit(projectFilesPath);
      }
    });
  }

}
