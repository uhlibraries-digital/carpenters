import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { remote } from 'electron';

let { Menu, MenuItem } = remote;

import { ArchivesSpaceService } from '../shared/archivesspace.service';
import { FilesService } from '../shared/files.service';
import { ProductionNotesService } from '../shared/production-notes.service';

@Component({
  selector: 'tree-view',
  templateUrl: './archivesspace/tree-view.component.html',
  styles: [ require('./tree-view.component.scss') ]
})
export class TreeViewComponent {

  @Input() children: any;

  constructor(
    private asService: ArchivesSpaceService,
    private changeRef: ChangeDetectorRef,
    private file: FilesService,
    private note: ProductionNotesService) {
  }

  toggle(c: any, e): void {
    e.stopPropagation();
    if (c.children.length > 0) {
      c.expanded = !c.expanded;
    }
  }

  onContextMenu(c: any, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    let contextMenu = new Menu();

    contextMenu.append(new MenuItem({
      label: (c.productionNotes ? 'Edit' : 'Add') + ' Note',
      click: () => {
        this.note.display(c);
      }
    }));
    if (c.productionNotes) {
      contextMenu.append(new MenuItem({
        label: 'Clear Note',
        click: () => {
          c.productionNotes = '';
          this.changeRef.detectChanges();
        }
      }));
    }
    contextMenu.append(new MenuItem({
      type: 'separator'
    }));

    if (c.artificial) {
      contextMenu.append(new MenuItem({
        label: 'Remove Item',
        click: () => {
          this.removeChild(c);
        }
      }));
    }
    else {
      contextMenu.append(new MenuItem({
        label: 'Add Item',
        click: () => {
          this.addChild(c);
        }
      }));
    }

    contextMenu.popup(remote.getCurrentWindow());
  }

  displayTitle(c: any): string {
    let title = '';
    if (c.level === 'series') {
      title = 'Series: ';
    }
    if (c.level === 'subseries') {
      title = 'Sub Series: ';
    }

    return c.title;
  }

  displayContainer(c: any): string {
    return this.asService.displayContainer(c);
  }

  hasSelectedChildren(parent: any): boolean {
    let found = false;
    for (let child of parent.children) {
      if (child.selected) {
        return true;
      }
      found = this.hasSelectedChildren(child) || found;
    }
    return found;
  }

  addChild(c: any): void {
    let index = c.children.length;
    let container = this.file.convertFromASContainer(c.containers[0]);
    container = this.file.addContainer(container, 'Item', index + 1);
    c.children.push({
      title: 'Item ' + this.padLeft(index + 1, 3, '0'),
      parent: c,
      index: index,
      selected: true,
      children: [],
      containers: [this.file.convertToASContainer(container)],
      record_uri: undefined,
      node_type: undefined,
      artificial: true,
      level: 'item',
      files: []
    });
    c.expanded = true;
    this.changeRef.detectChanges();
  }

  removeChild(c: any): void {
    let parent = c.parent;
    let index = parent.children.findIndex(function(e) {
      return e.index === c.index;
    });
    let files = parent.children[index].files;
    this.file.availableFiles = this.file.availableFiles.concat(files);
    parent.children.splice(index, 1);
    parent.expanded = parent.children.length > 0;

    /**
      Reorders the item numbers. Not sure how usful this is, seems like
      it could cause confusion in the interface.
    **/
    let newIndex = 0;
    for (let c of parent.children) {
      if (c.artificial) {
        c.title = 'Item ' + this.padLeft(newIndex + 1, 3, '0');
        c.index = newIndex;
        let container = this.file.convertFromASContainer(c.containers[0]);
        for (let con of container) {
          if (con.type === 'Item') {
            con.indicator = newIndex + 1;
          }
        }
        c.containers = [this.file.convertToASContainer(container)];
      }
      newIndex++;
    }

    this.changeRef.detectChanges();
  }

  containerClasses(c): string {
    return ['container', c.level].join(' ');
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }
}
