import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { remote } from 'electron';

let { Menu, MenuItem } = remote;

import { StandardItemService } from '../shared/standard-item.service';
import { LoggerService } from '../shared/logger.service';
import { Item } from '../shared/item';

@Component({
  selector: 'item-view',
  templateUrl: './standard/item-view.component.html',
  styles: [ require('./item-view.component.scss') ]
})
export class ItemViewComponent implements OnInit {

  private items: Item[];
  private addNumberOfItems: number = 1;
  private resource: any;

  private contextMenu: any;

  constructor(
    private log: LoggerService,
    private standardItem: StandardItemService,
    private changeRef: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.items = this.standardItem.getAll();
    this.resource = this.standardItem.getResource();
    
    this.standardItem.itemChanged.subscribe(items => this.items = items);
    this.standardItem.resourceChanged.subscribe(resource => this.resource = resource);
  }

  onContextMenu(index: number, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    let contextMenu = new Menu();
    contextMenu.append(new MenuItem({
      label: 'Insert Item',
      click: () => {
        this.insertItem(index);
      }
    }));
    contextMenu.append(new MenuItem({
      label: 'Remove Item',
      click: () => {
        this.removeItem(index);
      }
    }));

    contextMenu.popup(remote.getCurrentWindow());
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

}
