import { Injectable, Output, EventEmitter }    from '@angular/core';

import { Item } from 'app/classes/item';

@Injectable()
export class StandardItemService {

  private items: Item[] = [];
  private resource: any = {};

  @Output() itemChanged: EventEmitter<any> = new EventEmitter();
  @Output() resourceChanged: EventEmitter<any> = new EventEmitter();

  constructor() {
    this.resource.title = '';
    this.resource.sip_ark = '';
    this.resourceChanged.emit(this.resource);
  }

  clear(): any {
    this.resource = {title: '', sip_ark: ''};
    this.items = [];
    this.resourceChanged.emit(this.resource);
    this.itemChanged.emit(this.items);
  }

  getResource(): any {
    return this.resource;
  }

  setResourceTitle(title: string): void {
    this.resource.title = title;
    this.resourceChanged.emit(this.resource);
  }

  setResourceSipArk(ark: string): void {
    this.resource.sip_ark = ark;
    this.resourceChanged.emit(this.resource);
  }

  get(index: number): Item {
    return this.items[index];
  }

  getAll(): Item[] {
    this.itemChanged.emit(this.items);
    return this.items;
  }

  push(item: Item): void {
    this.items.push(item);
    this.itemChanged.emit(this.items);
  }

  fill(total: number): void {
    for (let i = 0; i < total; i++) {
      let num = this.items.length;
      this.items.push(new Item(num));
    }
    this.itemChanged.emit(this.items);
  }

  pop(): Item {
    let i = this.items.pop();
    this.itemChanged.emit(this.items);
    return i;
  }

  insert(index: number): Item {
    this.items.splice(index, 0, new Item());
    this.reorderItems(index);
    this.itemChanged.emit(this.items);
    return this.items[index];
  }

  remove(index: number): Item {
    let item = this.items.splice(index, 1);
    this.reorderItems(index);
    this.itemChanged.emit(this.items);
    return item.pop();
  }

  reorderItems(index: number): void {
    for (let i = index; i < this.items.length; i++) {
      this.items[i].assignTitleAndContainer(i);
    }
  }


}
