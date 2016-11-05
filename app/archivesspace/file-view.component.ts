import { Component, Input, ElementRef, Renderer } from '@angular/core';

import { ArchivesSpaceService } from '../shared/archivesspace.service';

@Component({
  selector: 'file-view',
  templateUrl: './archivesspace/file-view.component.html',
  styles: [ require('./file-view.component.scss') ]
})
export class FileViewComponent {

  @Input() children: any;

  constructor(
    private asService: ArchivesSpaceService,
    private renderer: Renderer) {
  }

  getParents(c: any): any[] {
    return this.asService.parentsToArray(c);
  }

  displayContainer(c: any): string {
    return this.asService.displayContainer(c);
  }

  containerClass(c: any): string {
    return ['container', c.level].join(' ');
  }

  handleDrop(c: any, type: string, e: any): void {
    e.stopPropagation();
    e.preventDefault();
    this.renderer.setElementClass(e.target, 'hover', false);

    let objectFiles:any[] = [];
    if (c.files) {
      objectFiles = c.files;
    }

    let dropFiles:File[] = e.dataTransfer.files;
    for (let file of dropFiles) {
      let objectFile: any = {
        lastModifiedDate: file.lastModifiedDate,
        name: file.name,
        path: file.path,
        size: file.size,
        type: file.type,
        purpose: type
      };
      objectFiles.push(objectFile);
    }
    c.files = objectFiles;
  }

  handleDragEnter(target: ElementRef) {
    this.renderer.setElementClass(target, 'hover', true);
  }

  handleDragLeave(target: ElementRef) {
    this.renderer.setElementClass(target, 'hover', false);
  }

  removeFile(c: any, index: number): void {
    c.files.splice(index, 1);
  }

}
