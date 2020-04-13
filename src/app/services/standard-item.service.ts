import { Injectable, EventEmitter }    from '@angular/core';
import { Headers, Http, RequestOptions, URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/toPromise';

import { Item } from 'app/classes/item';
import { FilesService } from './files.service';

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
      const num = this.items.length;
      const newItem = new Item(num);
      this.items.push(newItem);
    }
    this.itemChanged.emit(this.items);
  }

  pop(): Item {
    let i = this.items.pop();
    this.itemChanged.emit(this.items);
    return i;
  }

  insert(fs: FilesService, index: number): Item {
    const insertIndex = this.items.length - 1 === index ? index + 1 : index + 2;
    const newItem = new Item(insertIndex);
    const newItems = Array.from(this.items);

    newItems.splice(index + 1, 0, newItem);

    if (this.items.length - 1 !== index) {
      for (let i = newItems.length - 1; i > index; i--) {
        const item = newItems[i];
        newItems[i] = fs.updateContainerLocation(item, i + 1);
      }
    }
    fs.createFolderLocation(newItem);
    
    this.items = newItems;
    this.itemChanged.emit(this.items);

    return newItem;
  }

  remove(fs: FilesService, index: number): Item | null {
    const removedItem = this.items[index];
    const newItems = Array.from(this.items);
    newItems.splice(index, 1);

    if (!fs.orphanContainerLocation(removedItem)) {
      return null;
    }

    for (let i = index; i < newItems.length; i++) {
      const newItem = newItems[i];
      newItems[i] = fs.updateContainerLocation(newItem, i + 1);
    }

    this.items = newItems;
    this.itemChanged.emit(this.items);

    return removedItem;
  }
}
