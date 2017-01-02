import { Component, Input, ElementRef, Renderer } from '@angular/core';
import { shell } from 'electron';

import { ArchivesSpaceService } from '../shared/archivesspace.service';
import { FilesService } from '../shared/files.service';

@Component({
  selector: 'file-view',
  templateUrl: './file-manager/file-view.component.html',
  styles: [ require('./file-view.component.scss') ]
})
export class FileViewComponent {

  @Input() children: any;

  constructor(
    private asService: ArchivesSpaceService,
    private renderer: Renderer,
    private files: FilesService) {
  }

  getParents(c: any): any[] {
    return this.asService.parentsToArray(c);
  }

  displayContainer(c: any): string {
    return this.asService.displayContainer(c);
  }

  containerClass(c: any): string {
    return ['object-container', c.level].join(' ');
  }

  removeFile(c: any, index: number): void {
    let file = c.files[index];
    this.files.addAvailableFiles(file);
    c.files.splice(index, 1);
  }

  handleDrop(c: any, type: string, e: any): void {
    e.stopPropagation();
    e.preventDefault();
    this.renderer.setElementClass(e.target, 'hover', false);

    let dropFiles:File[] = e.dataTransfer.files;
    let files = [];
    for( let file of dropFiles ) {
      files.push(file.path);
    }
    this.files.addFilesToObject(c, type, files);
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
    shell.openItem(path);
  }

}
