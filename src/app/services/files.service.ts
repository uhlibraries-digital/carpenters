import { Injectable, EventEmitter, Output } from '@angular/core';
import { readdir } from 'fs';
import { statSync } from 'fs';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';

import { File } from '../classes/file';

@Injectable()
export class FilesService {

  selectedObjects: any;
  unselectObjects: any;
  availableFiles: File[];

  standardProject: boolean = false;

  @Output() filesChanged: EventEmitter<any> = new EventEmitter();

  constructor(
    private activity: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private log: LoggerService,
    private electronService: ElectronService) {
      this.availableFiles = [];
  }

  loadFiles(): void {
    let location = this.openDirectroy();
    if (location === '') {
      return;
    }
    this.activity.start('load-files');
    readdir(location, (err, files) => {
      if (err) {
        this.log.error(err.message);
        return;
      }

      this.setSelectedObjects();
      for (let file of files) {
        let stat = statSync(location + '/' + file);
        if (!stat.isDirectory()) {
          this.addAvailableFiles(new File(location + '/' + file));
        }
      }
      this.availableFiles.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      this.activity.stop('load-files');
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
    let usedFiles: string[] = [];
    for (let file of files) {
      let newFile = new File(file);
      newFile.setPurpose(type);
      this.removeFileFromObjects(newFile);
      obj.files.push(newFile);
      usedFiles.push(newFile.name);
    }
    this.removeAvailableFiles(usedFiles);
  }

  processFiles(filesPerObject?: number): void {
    if (!this.availableFiles || this.availableFiles.length === 0) {
      this.log.error('There are no available files to process.');
      return;
    }
    this.activity.start();

    this.unselectObjects = [];
    this.setSelectedObjects();
    if (this.selectedObjects.length === 0) {
      this.activity.stop();
      this.log.error('Please select some archival objects before loading files');
      return;
    }

    let usedFiles: string[] = [];
    if (filesPerObject) {
      usedFiles = this.processFilesForGrouping(filesPerObject);
    }
    else {
      usedFiles = this.processFilesForContainer();
    }

    this.removeAvailableFiles(usedFiles);
    this.unselectArchivalObjectsWithoutFiles();
    this.activity.stop();
  }

  removeAvailableFiles(filenames: string[]): void {
    this.availableFiles = this.availableFiles.filter(file => {
      return filenames.indexOf(file.name) === -1;
    });
    this.filesChanged.emit(this.availableFiles);
  }

  addAvailableFiles(file: File, force?: boolean): void {
    if ((!this.fileAssigned(file) && !this.fileLoaded(file)) || force) {
      this.availableFiles.push(file);
    }
    this.filesChanged.emit(this.availableFiles);
  }

  fileAssigned(file: File): boolean {
    if (!this.selectedObjects) { return false; }
    let test = this.selectedObjects.findIndex((value) => {
      if (!Array.isArray(value.files)) {
        return false;
      }
      let fileIndex = value.files.findIndex((fileValue) => {
        return fileValue.path === file.path;
      });
      return fileIndex > -1;
    });
    return test > -1;
  }

  fileLoaded(file: File): boolean {
    let test = this.availableFiles.findIndex((value) => {
      return value.path === file.path;
    });
    return test > -1;
  }

  addContainer(container: any, type: string, indicator: string): any {
    let rContainer = container.slice(0);
    for (let i = 0; i < rContainer.length; i++) {
      let c = Object.assign({}, rContainer[i]);
      if (c.type === null) {
        c.type = type;
        c.indicator = indicator
        rContainer[i] = c;
      }
    }
    return rContainer;
  }

  convertToASContainer(container: any): any {
    let c = {};
    for (let i = 0; i < container.length; i++) {
      c['type_' + (i + 1)] = container[i].type;
      c['indicator_' + (i + 1)] = container[i].indicator;
    }
    return c;
  }

  convertFromASContainer(container: any): any {
    let rContainer = [];
    for (let i = 1; i <= 3; i++) {
      rContainer.push({
        type: container['type_' + i],
        indicator: container['indicator_' + i]
      });
    }
    return rContainer;
  }

  private setSelectedObjects(): void {
    this.selectedObjects = this.asService.selectedArchivalObjects();
    this.standardProject = false;
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
      this.standardProject = true;
    }
  }

  private processFilesForContainer(): string[] {
    let usedFiles: string[] = [];
    for (let file of this.availableFiles) {
      let container = this.containerByFileName(file.name);
      if (!container) {
        this.log.warn('No container information found in filename: ' + file.name);
        continue;
      }
      let found = this.findSelectionByContainer(container);
      if (found) {
        if (!found.files) {
          found.files = [];
        }
        found.files.push(file);
        this.log.success(file.name + ' added to archival object "' + found.title + '"', false);
        usedFiles.push(file.name);
      }
      else {
        if (this.createArtificialChild(container, [file])) {
          this.selectedObjects = this.asService.selectedArchivalObjects();
          usedFiles.push(file.name);
        }
        else {
          this.log.error("Couldn't find selected archival object for filename: " + file.name);
        }
      }
    }
    return usedFiles;
  }

  private processFilesForGrouping(filesPerObject: number): string[] {
    let usedFiles: string[] = [];
    let files: File[] = this.availableFiles;
    files = this.splitFilesByContainer(files);

    for (let key in files) {
      let filesByPerpose = files[key];
      let container = this.containerByFileName(key);
      let found = this.findSelectionByContainer(container);

      if (!found) {
        // Selection might be for an item and not a folder
        usedFiles = usedFiles.concat(
          this.processFilesForItemSelection(filesByPerpose, filesPerObject, container)
        );
      }
      else {
        usedFiles = usedFiles.concat(
          this.processFilesWithoutItemSelection(found, filesByPerpose, filesPerObject, container)
        );
      }
    }

    return usedFiles;
  }

  private selectFiles(): string[] {
    let filenames = this.electronService.dialog.showOpenDialog({
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
    let filenames = this.electronService.dialog.showOpenDialog({
      title: 'Select Project Directory...',
      buttonLabel: 'Select',
      properties: [
        'openDirectory'
      ]
    });
    return (filenames) ? filenames[0] : '';
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

  private hasContainer(value: any, container: any): boolean {
    if (value.containers.length === 0) {
      return false;
    }
    let goodCount = 0;
    let c = value.containers[0];
    for (let i = 0; i < container.length; i++) {
      let typeString = 'type_' + (i + 1);
      let indicatorString = 'indicator_' + (i + 1);

      if (c[typeString]) {
        c[typeString] = c[typeString].replace(/OVS[\s_]/i, '');
      }
      if (c[typeString] === container[i].type &&
          c[indicatorString] === container[i].indicator) {
        goodCount++;
      }
    }
    // Get rid of all the null values to see the correct container count
    let count = container.filter((value) => {
      return value.indicator !== null;
    }).length;

    return goodCount === count;
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private createArtificialChild(container: any, files: File[]): boolean {
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
      files: files
    });
    this.log.warn('Created "' + title + '"', false);
    this.unselectObjects.push(found);
    return true;
  }

  private unselectArchivalObjectsWithoutFiles(): void {
    this.unselectObjects.map((value) => {
      if (!value.files || value.files.length === 0) {
        value.selected = false;
      }
      return value;
    });
    this.selectedObjects = this.asService.selectedArchivalObjects();
  }

  private splitFilesByContainer(files: File[]): any {
    let splitFiles: any = {};

    files.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    for (let file of files) {
      let match = file.name.match(/_([a-z]\d{3})/gi);
      if (match) {
        let key = match.join('');
        if (!splitFiles[key]) {
          splitFiles[key] = {
            'preservation': [],
            'access-copy': [],
            'modified-master': []
          };
        }
        splitFiles[key][file.purpose].push(file);
      }
      else {
        this.log.warn('No container information found in filename: ' + file.name);
      }
    }
    return splitFiles;
  }

  private findSelectionByContainer(container: any): any {
    return this.selectedObjects.find((value) => {
      return this.isContainer(value, container);
    });
  }

  private findSelectionsContainingContainer(container: any): any {
    return this.selectedObjects.filter((value) => {
      return this.hasContainer(value, container);
    });
  }

  private removeFileFromObjects(file: File): void {
    if (this.selectedObjects === undefined) return;
    for (let object of this.selectedObjects) {
      if (!object.files) { continue; }
      let i = object.files.findIndex((value) => {
        return value.path === file.path;
      });
      if (i > -1) {
        object.files.splice(i, 1);
      }
    }
  }

  private processFilesWithoutItemSelection(
    found: any,
    filesByPerpose: any,
    filesPerObject: number,
    container: any): string[] {
      let usedFiles: string[] = [];
      let itemObjectsNeeded = Math.floor(filesByPerpose['access-copy'].length / filesPerObject);
      for (let i = 1; i <= itemObjectsNeeded; i++) {
        let acFiles = filesByPerpose['access-copy'].splice(0, filesPerObject);
        let mmFiles = filesByPerpose['modified-master'].splice(0, filesPerObject);
        let pmFiles = filesByPerpose['preservation'].splice(0, filesPerObject);
        let childFiles = acFiles.concat(mmFiles, pmFiles);

        if (this.containerHasItem(container)) {
          found.files = found.files.concat(childFiles);
        }
        else {
          let title = 'Item ' + this.padLeft(i, 3, '0');
          let itemContainer = this.addContainer(container, 'Item', String(i));
          found.children.push({
            title: title,
            parent: found,
            index: i,
            selected: true,
            children: [],
            containers: [this.convertToASContainer(itemContainer)],
            record_uri: undefined,
            node_type: undefined,
            artificial: true,
            level: 'item',
            files: childFiles
          });
          this.log.warn('Created "' + title + '" for "' + found.title + '"', false);
          this.unselectObjects.push(found);
        }

        for (let f of childFiles) {
          usedFiles.push(f.name);
        }
      }
      return usedFiles;
  }

  private processFilesForItemSelection(
    filesByPerpose: any,
    filesPerObject: number,
    container: any): string[] {
      let usedFiles: string[] = [];

      let objects = [];
      if (this.standardProject) {
        objects = this.standardItem.getAll().filter((item) => {
          return item.files.length === 0;
        });
      }
      else {
        objects = this.findSelectionsContainingContainer(container);
      }

      if (objects.length === 0) {
        this.log.warn("Couldn't find selected Archival Object for files with container: " +
          this.containerToString(container)
        );
        return [];
      }
      for (let object of objects) {
        let acFiles = filesByPerpose['access-copy'].splice(0, filesPerObject);
        let mmFiles = filesByPerpose['modified-master'].splice(0, filesPerObject);
        let pmFiles = filesByPerpose['preservation'].splice(0, filesPerObject);
        let childFiles = acFiles.concat(mmFiles, pmFiles);

        if (object.files === undefined) {
          object.files = [];
        }
        object.files = object.files.concat(childFiles);

        for (let f of childFiles) {
          usedFiles.push(f.name);
        }
      }

      return usedFiles;
  }

  private containerToString(container: any): string {
    let returnString = '';
    let newContainer = container.filter((value) => {
      return value.type !== null;
    })
    for (let c of newContainer) {
      returnString += c.type + ' ' + c.indicator + ', ';
    }
    return returnString.slice(0, -2);
  }

}
