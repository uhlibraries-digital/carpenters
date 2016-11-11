import { Injectable } from '@angular/core';
import { remote } from 'electron';
import { readdir } from 'fs';

import { ArchivesSpaceService } from './archivesspace.service';
import { LoggerService } from './logger.service';

import { File } from './file';

let { dialog } = remote;

@Injectable()
export class FilesService {

  selectedObjects: any;
  unselectObjects: any;

  constructor(
    private asService: ArchivesSpaceService,
    private log: LoggerService) {
  }

  loadFiles(): void {
    let location = this.openDirectroy();
    if (location === '') {
      return;
    }
    readdir(location, (err, files) => {
      if (err) {
        this.log.error(err.message);
        throw err;
      }
      this.processFiles(location, files);
    });
  }

  addFilesToObject(obj: any, type: string, files?: any[]): void {
    if (!files) {
      files = this.selectFiles();
    }
    if (files.length === 0) {
      return;
    }

    if (!obj.files) {
      obj.files = [];
    }
    for (let file of files) {
      let newFile = new File(file);
      newFile.setPurpose(type);
      obj.files.push(newFile);
    }
  }

  private selectFiles(): string[] {
    let filenames = dialog.showOpenDialog({
      title: 'Select File...',
      buttonLabel: 'Select',
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: [
        'openFile',
        'multiSelections'
      ]
    });
    return (filenames) ? filenames : [];
  }

  private openDirectroy(): string {
    let filenames = dialog.showOpenDialog({
      title: 'Select Project Directory...',
      buttonLabel: 'Select',
      properties: [
        'openDirectory'
      ]
    });
    return (filenames) ? filenames[0] : '';
  }

  private processFiles(location: string, files: string[]): void {
    this.unselectObjects = [];
    let selectedObjects = this.selectedObjects = this.asService.selectedArchivalObjects();
    if (selectedObjects.length === 0) {
      this.log.error('Please select some archival objects before loading files');
      return;
    }
    this.clearFiles(selectedObjects);

    for (let file of files) {
      let container = this.containerByFileName(file);
      if (!container) {
        this.log.warn('No container information found in filename: ' + file);
        continue;
      }
      let found = selectedObjects.find((value) => {
        return this.isContainer(value, container);
      });
      if (found) {
        let newFile = new File(location + '/' + file);
        found.files.push(newFile);
        this.log.success(file + ' added to archival object "' + found.title + '"', false);
      }
      else {
        if (this.createArtificialChild(container, location, file)) {
          selectedObjects = this.selectedObjects = this.asService.selectedArchivalObjects();
        }
        else {
          this.log.error("Couldn't find selected archival object for filename: " + file);
        }
      }
    }

    this.unselectArchivalObjectsWithoutFiles();
  }

  private containerByFileName(file: string): any[] {
    let containerTypes = {
      b: 'Box',
      c: 'Cabinet',
      d: 'Drawer',
      f: 'Folder',
      i: 'Item',
      t: 'Tube'
    };

    let match = file.match(/_([a-z]\d{3})/gi);
    if (!match) {
      return null;
    }

    let container = match.map((e) => {
      let type = containerTypes[e[1]];
      let number = +e.slice(2);
      return { type: type, indicator: String(number) };
    });

    for (let i = container.length; i < 3; i++) {
      container.push({ type: null, indicator: null });
    }
    return container;
  }

  private containerHasItem(container: any): any {
    let item = container.find((value) => {
      return value.type === 'Item';
    });

    return item;
  }

  private containerWithoutItem(container: any): any {
    let newcontainer = [];
    for (let c of container) {
      if (c.type !== 'Item') {
        newcontainer.push(c);
      }
    }
    for (let i = newcontainer.length; i < 3; i++) {
      newcontainer.push({ type: null, indicator: null});
    }
    return newcontainer;
  }

  private clearFiles(objects: any[]) {
    for (let o of objects) {
      o.files = [];
    }
  }

  private isContainer(value: any, container: any): boolean {
    if (value.containers.length === 0) {
      return false;
    }
    let c = value.containers[0];
    for (let i = 0; i < container.length; i++) {
      let typeString = 'type_' + (i + 1);
      let indicatorString = 'indicator_' + (i + 1);

      if (c[typeString]) {
        c[typeString] = c[typeString].replace(/OVS[\s_]/i, '');
      }
      if (c[typeString] !== container[i].type ||
          c[indicatorString] !== container[i].indicator) {
        return false;
      }
    }

    return true;
  }

  private convertToASContainer(container: any): any {
    let c = {};
    for (let i = 0; i < container.length; i++) {
      c['type_' + (i + 1)] = container[i].type;
      c['indicator_' + (i + 1)] = container[i].indicator;
    }
    return c;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private createArtificialChild(container: any, location: string, file: string): boolean {
    let item = this.containerHasItem(container);
    if (!item) {
      return false;
    }
    let itemless = this.containerWithoutItem(container);
    let found = this.selectedObjects.find((value) => {
      return this.isContainer(value, itemless);
    });
    if (!found) {
      return false;
    }
    let newFile = new File(location + '/' + file);
    let title = 'Item ' + this.padLeft(item.indicator, 3, '0');
    found.children.push({
      title: title,
      parent: found,
      index: item.indicator,
      selected: true,
      children: [],
      containers: [this.convertToASContainer(container)],
      record_uri: undefined,
      node_type: undefined,
      artificial: true,
      level: 'item',
      files: [newFile]
    });
    this.log.warn('Created "' + title + '" for file ' + file, false);
    this.unselectObjects.push(found);
    return true;
  }

  private unselectArchivalObjectsWithoutFiles(): void {
    this.unselectObjects.map((value) => {
      if (value.files.length === 0) {
        value.selected = false;
      }
      return value;
    });
    this.selectedObjects = this.asService.selectedArchivalObjects();
  }


}
