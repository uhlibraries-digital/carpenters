import { Component, Input, ElementRef, Renderer } from '@angular/core';

import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { FilesService } from 'app/services/files.service';
import { ElectronService } from 'app/services/electron.service';
import { LocalStorageService } from 'app/services/local-storage.service';
import { LoggerService } from 'app/services/logger.service';

@Component({
  selector: 'file-view',
  templateUrl: './file-view.component.html',
  styleUrls: [ './file-view.component.scss' ]
})
export class FileViewComponent {

  @Input() children: any;

  constructor(
    private asService: ArchivesSpaceService,
    private renderer: Renderer,
    private files: FilesService,
    private electronService: ElectronService,
    private storage: LocalStorageService,
    private log: LoggerService) { }

  getParents(c: any): any[] {
    return this.asService.parentsToArray(c);
  }

  displayContainer(c: any): string {
    return this.asService.displayContainer(c);
  }

  containerClass(c: any): string {
    return ['object-container', c.level].join(' ');
  }

  removeFile(c: any, uuid: string): void {
    let index = c.files.findIndex(file => file.uuid === uuid);
    c.files.splice(index, 1);
  }

  handleDrop(c: any, purpose: string, e: any): void {
    e.stopPropagation();
    e.preventDefault();
    this.renderer.setElementClass(e.target, 'hover', false);
    let dropFiles:File[];
    try {
      dropFiles = JSON.parse(e.dataTransfer.getData('text'));
      if (!Array.isArray(dropFiles)) {
        dropFiles = [dropFiles];
      }
    }
    catch(execption) {
      dropFiles = e.dataTransfer.files;
    }
    let files = [];
    for( let file of dropFiles ) {
      files.push(file.path);
    }
    this.files.addFilesToObject(c, purpose, files);
  }

  handleDragEnter(target: ElementRef): void {
    this.renderer.setElementClass(target, 'hover', true);
  }

  handleDragLeave(target: ElementRef): void {
    this.renderer.setElementClass(target, 'hover', false);
  }

  addFile(c: any, type: string): void {
    this.files.addFilesToObject(c, type);
  }

  openFile(path: string): void {
    this.electronService.shell.openItem(path);
  }

  openArchivalObjectUrl(c: any) {
    let preferences = this.storage.get('preferences');
    if (!preferences.archivesspace.frontend) {
      this.log.warn('Please include the Archives Space Frontend URL in preferences.');
      return;
    }

    if (c.artificial) {
      this.electronService.shell.openExternal(preferences.archivesspace.frontend + c.parent_uri);
    }
    else {
      this.electronService.shell.openExternal(preferences.archivesspace.frontend + c.record_uri);
    }
  }

}
