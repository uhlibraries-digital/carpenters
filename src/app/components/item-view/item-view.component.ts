import { Component, OnInit, ChangeDetectorRef, ViewChild, AfterViewChecked } from '@angular/core';

import { StandardItemService } from 'app/services/standard-item.service';
import { LoggerService } from 'app/services/logger.service';
import { ProductionNotesService } from 'app/services/production-notes.service';
import { ElectronService } from 'app/services/electron.service';

import { Item } from '../../classes/item';

@Component({
  selector: 'item-view',
  templateUrl: './item-view.component.html',
  styleUrls: [ './item-view.component.scss' ]
})
export class ItemViewComponent implements OnInit, AfterViewChecked {

  resource: any;
  addNumberOfItems: number = 1;
  items: Item[];

  @ViewChild('titleField') titleField;

  private contextMenu: any;

  constructor(
    private log: LoggerService,
    private standardItem: StandardItemService,
    private note: ProductionNotesService,
    private changeRef: ChangeDetectorRef,
    private electronService: ElectronService) {
  }

  ngOnInit(): void {
    this.items = this.standardItem.getAll();
    this.resource = this.standardItem.getResource();

    this.standardItem.itemChanged.subscribe(items => this.items = items);
    this.standardItem.resourceChanged.subscribe(resource => this.resource = resource);
  }

  ngAfterViewChecked(): void {
    if (this.titleField) {
      this.titleField.nativeElement.focus();
    }
  }

  onContextMenu(index: number, c: any, e: MouseEvent) {
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
    contextMenu.append(new this.electronService.MenuItem({
      label: 'Insert Item',
      click: () => {
        this.insertItem(index);
      }
    }));
    contextMenu.append(new this.electronService.MenuItem({
      label: 'Remove Item',
      click: () => {
        this.removeItem(index);
      }
    }));

    contextMenu.popup(this.electronService.remote.getCurrentWindow());
  }

  addItems(): void {
    this.standardItem.fill(this.addNumberOfItems);
    this.addNumberOfItems = 1;
  }

  insertItem(index: number): void {
    let item = this.standardItem.insert(index);
    this.changeRef.detectChanges();
    this.log.success(item.title + ' inserted', false);
  }

  removeItem(index: number): void {
    let item = this.standardItem.remove(index);
    this.changeRef.detectChanges();
    this.log.success(item.title + ' removed', false);
  }

  setTitle(): void {
    this.standardItem.setResourceTitle(this.resource.title);
  }

  titleIsArk(): boolean {
    return this.resource.title.match(/https?:\/\/.*\/ark:\/\d+\/.*$/);
  }

  editTitle(c: any): void {
    c.editTitle = true;
    c.oldTitle = c.title;
    this.changeRef.detectChanges();
    this.ngAfterViewChecked();
  }

  keydownCheck(event: KeyboardEvent, c: any): void {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault();
      event.stopPropagation();
      c.editTitle = false;
      this.changeRef.detectChanges();
    }
    else if (event.code === 'Escape') {
      c.editTitle = false;
      c.title = c.oldTitle;
      this.changeRef.detectChanges();
    }
  }

}
