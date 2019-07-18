import { Component, Input, ChangeDetectorRef, ViewChild, AfterViewChecked } from '@angular/core';
import { v4 } from 'uuid';

import { LoggerService } from 'app/services/logger.service';
import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { FilesService } from 'app/services/files.service';
import { ProductionNotesService } from 'app/services/production-notes.service';
import { ElectronService } from 'app/services/electron.service';
import { ArchivalItemService } from 'app/services/archival-item-service';

@Component({
  selector: 'tree-view',
  templateUrl: './tree-view.component.html',
  styleUrls: [ './tree-view.component.scss' ]
})
export class TreeViewComponent implements AfterViewChecked {

  @Input() children: any;

  @ViewChild('titleField') titleField;
  titleFieldClicked: boolean = false;

  constructor(
    private asService: ArchivesSpaceService,
    private changeRef: ChangeDetectorRef,
    private file: FilesService,
    private note: ProductionNotesService,
    private archivalItemService: ArchivalItemService,
    private log: LoggerService,
    private electronService: ElectronService) {

    this.archivalItemService.displayMultipleChanged.subscribe(() => {
      this.changeRef.detectChanges();
    })
  }

  ngAfterViewChecked(): void {
    if (this.titleField && this.titleFieldClicked) {
      this.titleField.nativeElement.focus();
      this.titleField.nativeElement.select();
      this.titleFieldClicked = false;
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
      contextMenu.append(new this.electronService.MenuItem({
        label: 'Add Multiple Items',
        click: () => {
          this.archivalItemService.display(c);
        }
      }))
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
    return c.containersLoading ? 'Loading container information'
      : this.asService.displayContainer(c);
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
    this.archivalItemService.addChild(c);
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
      this.titleFieldClicked = true;
      this.changeRef.detectChanges();
    }
  }

  clickConfirm (c: any): void {
    c.editTitle = false;
    this.titleFieldClicked = false;
    this.changeRef.detectChanges();
  }

  clickCancel (c: any) {
    c.editTitle = false;
    c.title = c.oldTitle;
    this.titleFieldClicked = false;
    this.changeRef.detectChanges();
  }

  keydownCheck(event: KeyboardEvent, c: any): void {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      this.clickConfirm(c);
    }
    else if (event.code === 'Escape') {
      this.clickCancel(c);
    }
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }
}
