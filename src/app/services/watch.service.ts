import { Injectable, EventEmitter } from '@angular/core';
import { watchFile, existsSync } from 'fs';

@Injectable()
export class WatchService {

  filename: string;
  watchEvent: any;

  projectChanged: EventEmitter<any> = new EventEmitter();

  public projectFile(projectFilename: string): void {
    if (!existsSync(projectFilename)) return;

    this.filename = projectFilename;
    watchFile(projectFilename, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.projectChanged.emit(this.filename);
      }
    });
  }

  public unWatch(path: string): void {
    try{
      this.watchEvent.close();
    } catch(e) { }
  }

}
