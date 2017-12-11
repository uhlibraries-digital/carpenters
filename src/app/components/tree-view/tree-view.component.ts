import { Component, Input, ChangeDetectorRef, ViewChild, AfterViewChecked } from '@angular/core';
import { v4 } from 'uuid';

import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { FilesService } from 'app/services/files.service';
import { ProductionNotesService } from 'app/services/production-notes.service';
import { ElectronService } from 'app/services/electron.service';

@Component({
  selector: 'tree-view',
  templateUrl: './tree-view.component.html',
  styleUrls: [ './tree-view.component.scss' ]
})
export class TreeViewComponent implements AfterViewChecked {

  @Input() children: any;

  @ViewChild('titleField') titleField;

  constructor(
    private asService: ArchivesSpaceService,
    private changeRef: ChangeDetectorRef,
    private file: FilesService,
    private note: ProductionNotesService,
    private electronService: ElectronService) {
  }

  ngAfterViewChecked(): void {
    if (this.titleField) {
      this.titleField.nativeElement.focus();
    }
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

    let contextMenu = new this.electronService.Menu();

    contextMenu.append(new this.electronService.MenuItem({
      label: (c.productionNotes ? 'Edit' : 'Add') + ' Note',
      click: () => {
        this.note.display(c);
      }
    }));
    if (c.productionNotes) {
      contextMenu.append(new this.electronService.MenuItem({
        label: 'Clear Note',
        click: () => {
          c.productionNotes = '';
          this.changeRef.detectChanges();
        }
      }));
    }
    contextMenu.append(new this.electronService.MenuItem({
      type: 'separator'
    }));

    if (c.artificial) {
      contextMenu.append(new this.electronService.MenuItem({
        label: 'Remove Item',
        click: () => {
          this.removeChild(c);
        }
      }));
    }
    else {
      contextMenu.append(new this.electronService.MenuItem({
        label: 'Add Item',
        click: () => {
          this.addChild(c);
        }
      }));
    }

    contextMenu.popup(this.electronService.remote.getCurrentWindow());
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
      uuid: v4(),
      title: 'Item ' + this.padLeft(index + 1, 3, '0'),
      parent: c,
      index: index,
      selected: true,
      children: [],
      containers: [this.file.convertToASContainer(container)],
      record_uri: undefined,
      parent_uri: c.record_uri,
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
    parent.children.splice(index, 1);
    parent.expanded = parent.children.length > 0;

    let newIndex = 0;
    for (let c of parent.children) {
      if (c.artificial) {
        if ( c.title.match(/Item \d+/) ) {
          c.title = 'Item ' + this.padLeft(newIndex + 1, 3, '0');
        }
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

  editTitle(c: any): void {
    if (c.artificial) {
      c.editTitle = true;
      c.oldTitle = c.title;
    }
  }

  keydownCheck(event: KeyboardEvent, c: any): void {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault();
      event.stopPropagation();
      c.editTitle = false;
    }
    else if (event.code === 'Escape') {
      c.editTitle = false;
      c.title = c.oldTitle;
    }
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }
}
