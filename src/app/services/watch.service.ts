import { Injectable, EventEmitter } from '@angular/core';
import { watchFile, watch, existsSync } from 'fs';
import { basename } from 'path';

@Injectable()
export class WatchService {

  filename: string;
  watchEvent: any;

  projectChanged: EventEmitter<any> = new EventEmitter();
  hierarchyChanged: EventEmitter<any> = new EventEmitter();

  public projectFile(projectFilename: string): void {
    if (!existsSync(projectFilename)) return;

    this.filename = projectFilename;
    watchFile(projectFilename, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.projectChanged.emit(this.filename);
      }
    });
  }

  public fileHierarchy(projectFilesPath: string): void {
    if (!existsSync(projectFilesPath)) return;

    this.unWatch(projectFilesPath);
    this.watchEvent = watch(projectFilesPath, { recursive: true }, (eventType, filename) => {
      if (eventType === 'rename') {
        this.hierarchyChanged.emit(projectFilesPath);
      }
    });
    this.hierarchyChanged.emit(projectFilesPath);
  }

  public unWatch(path: string): void {
    try{
      this.watchEvent.close();
    } catch(e) { }
  }

}
