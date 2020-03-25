import { Injectable, Output, EventEmitter } from '@angular/core';
import { LoggerService } from './logger.service';
import { FilesService } from 'app/services/files.service';
import { v4 } from 'uuid';

@Injectable()
export class ArchivalItemService {

  @Output() displayMultipleItemOption: EventEmitter<any> = new EventEmitter();
  @Output() displayMultipleChanged: EventEmitter<any> = new EventEmitter();

  constructor(
    private file: FilesService,
    private log: LoggerService) {
  }

  display(child: any) {
    this.displayMultipleItemOption.emit(child);
  }

  add(child: any, total: number) {
    for (let i = 0; i < total; i++) {
      this.addChild(child);
    }
    this.displayMultipleChanged.emit();
  }

  addChild(c: any): void {
    if (c.containersLoading) {
      this.log.warn("Hold on, container still loading");
      return;
    }
    if (!c.containers[0]) { return; }

    let index = c.children.length;
    let container = this.file.convertFromASContainer(c.containers[0]);
    container = this.file.addContainer(container, 'Item', index + 1);
    c.children.push({
      uuid: v4(),
      title: 'Item ' + this.padLeft(index + 1, 3, '0'),
      dates: [],
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
      files: [],
      containerPath: this.file.containerToPath(container)
    });
    c.expanded = true;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
