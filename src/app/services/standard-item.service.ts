import { Injectable, EventEmitter }    from '@angular/core';
import { Headers, Http, RequestOptions, URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/toPromise';

import { Item } from 'app/classes/item';

@Injectable()
export class StandardItemService {

  private resource: any = {};

  items: Item[] = [];
  itemChanged: EventEmitter<any> = new EventEmitter();
  resourceChanged: EventEmitter<any> = new EventEmitter();

  constructor(
    private http: Http) {
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
    if (title.match(/https?:\/\/.*\/ark:\/\d+\/.*$/)) {
      this.setResourceTitleByArk(title);
      this.resource.title = title;
    }
    else {
      this.resource.collectionArkUrl = this.resource.collectionArk = '';
      this.resource.vocabTitle = this.resource.title = title;
    }
    this.resourceChanged.emit(this.resource);
  }

  setResourceTitleByArk(url: string): void {
    this.resource.collectionArkUrl = url;
    this.resource.vocabTitle = '';
    
    let match = url.match(/ark:\/\d+\/.*$/);
    if (!match) { return; }

    this.resource.collectionArk = match[0];

    this.http.get(url + '.rdf')
      .toPromise()
      .then((data) => {
        try {
          let parser = new DOMParser();
          let xml = parser.parseFromString(data['_body'], "text/xml");
          let prefLabels = xml.getElementsByTagName('prefLabel');
          this.resource.vocabTitle = prefLabels[prefLabels.length - 1].textContent;
        }
        catch(e) {
          this.resource.vocabTitle = '';
        }
      })
      .catch((error) => {
        this.resource.vocabTitle = '';
      });
  }

  setResourceAic(aic: string): void {
    this.resource.aic = aic;
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
    let item = this.items.splice(index, 1).pop();
    this.reorderItems(index);
    this.itemChanged.emit(this.items);
    return item;
  }

  reorderItems(index: number): void {
    for (let i = index; i < this.items.length; i++) {
      this.items[i] = this.assignTitleAndContainer(this.items[i], i);
    }
  }

  assignTitleAndContainer(item: Item, index: number): Item {
    if ( !item.title || item.title.match(/Item \d+/) ) {
      item.title = 'Item ' + this.padLeft(index + 1, 3, '0');
    }
    item.containers = [{
      type_1: 'Item',
      indicator_1: index + 1
    }];
    return item;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
