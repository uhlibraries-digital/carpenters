import { Injectable, EventEmitter } from '@angular/core';
import {
  readdir, 
  statSync, 
  existsSync, 
  rename, 
  renameSync,
  readdirSync,
  createReadStream, createWriteStream
} from 'fs';
import { parse, dirname } from 'path';
import * as mkdirp from 'mkdirp';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';
import { SaveService } from './save.service';

import { File } from 'app/classes/file';

@Injectable()
export class FilesService {

  selectedObjects: any;
  unselectObjects: any;

  purposeMap: any[];

  filesChanged: EventEmitter<any> = new EventEmitter();

  projectFilePath: string = '';
  filesWatchFirstRun: boolean = true;

  constructor(
    private activity: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private log: LoggerService,
    private saveService: SaveService,
    private electronService: ElectronService) {

    this.asService.selectedArchivalObjectsChanged.subscribe((objects) => {
      this.selectedObjects = objects;
    });
    this.standardItem.itemChanged.subscribe((objects) => {
      this.selectedObjects = objects;
    });

    this.saveService.saveChanged.subscribe((location) => {
      this.createFolderHierarchy(dirname(location));
      this.projectFilePath = dirname(location) + '/Files/';
    });

    let o = this.asService.selectedArchivalObjects();
    if (o.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    this.purposeMap = [
      {
        name: 'preservation',
        title: 'Preservation'
      },
      {
        name: 'modified-master',
        title: 'Modified Master'
      },
      {
        name: 'access-copy',
        title: 'Access Copy'
      },
      {
        name: 'sub-documents',
        title: 'Submission Documentation'
      },
    ];

  }

  addFilesToObject(obj: any, purpose: string, files?: any[]): void {
    if (!this.saveService.saveLocation) {
      this.log.warn("Please save this project before adding files.");
      return;
    }

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
      newFile.setPurpose(purpose);
      if (this.updateFileLocation(obj, newFile)) {
        this.removeFileFromObjects(newFile);
        newFile.name = this.filenameWithPurposeSuffix(newFile);
        obj.files.push(newFile);
      }
    }
    obj.files.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    this.filesChanged.emit(obj.files);
  }

  addContainer(container: any, type: string, indicator: string): any {
    let rContainer = container.slice(0);
    for (let i = 0; i < rContainer.length; i++) {
      let c = Object.assign({}, rContainer[i]);
      if (c.type === null) {
        c.type = type;
        c.indicator = indicator
        rContainer[i] = c;
        return rContainer;
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

  createFolderHierarchy(path: string): void {
    this.activity.start('fileHierarchy');
    for (let o of this.selectedObjects) {
        if (o.containers.length === 1) {
          let container = this.convertFromASContainer(o.containers[0]);
          let containerPath = path + '/Files/' + this.containerToPath(container);
          mkdirp.sync(containerPath, (err) => {
            if (err) console.error(err);
          });
        }
    }
    this.activity.stop('fileHierarchy');
  }

  createFolderLocation(obj: any): void {
    if (obj.containers.length === 0) {
      return;
    }
    if (this.projectFilePath === '') {
      return;
    }

    const newContainerPath = this.fullContainerPath(obj.containers[0]);
    mkdirp.sync(newContainerPath, (err) => {
      if (err) {
        this.log.error(err.message);
      }
    })
  }

  fullContainerPath(container: any): string {
    let c = this.convertFromASContainer(container);
    return this.projectFilePath + this.containerToPath(c);
  }

  orphanFile(obj: any, fileUuid: string): void {
    if (obj.containersLoading) {
      this.log.warn("Hold on, container information still loading")
      return;
    }
    if (!obj.containers || !obj.containers[0]) {
      this.log.error("Couldn't move file to orphan directory because there is no container information available");
      return;
    }
    if (this.projectFilePath === '') {
      this.log.error("Couldn't move file to orphan directory because the project file has not been created yet");
      return;
    }

    let index = obj.files.findIndex(file => file.uuid === fileUuid);
    if (index === -1 ) { return; }

    let file = obj.files[index];
    obj.files.splice(index, 1);

    let containerPath = this.containerToPath(this.convertFromASContainer(obj.containers[0]));
    let orphanPath = this.projectFilePath.replace(/\/Files\/?$/, '/Orphaned/');
    let destPath = orphanPath + containerPath;

    mkdirp.sync(destPath);
    rename(file.path, destPath + file.name, (err) => {
      if (err) {
        console.error(err);
        this.log.error(err.message);
      }
    });
    this.filesChanged.emit(obj.files);
  }

  orphanContainerLocation(obj: any): boolean {
    if (obj.containersLoading) {
      this.log.warn("Hold on, container information still loading")
      return false;
    }
    if (!obj.containers || !obj.containers[0]) {
      this.log.error("Couldn't move file to orphan directory because there is no container information available", false);
      return false;
    }
    if (this.projectFilePath === '') {
      return false;
    }

    this.activity.start('orphan-container');
    let containerPath = this.containerToPath(this.convertFromASContainer(obj.containers[0]));
    let orphanPath = this.projectFilePath.replace(/\/Files\/?$/, '/Orphaned/');
    let destPath = orphanPath + containerPath;
    mkdirp.sync(orphanPath);

    let dupCounter = 1;
    let orgDestPath = destPath;
    while(existsSync(destPath)) {
      destPath = orgDestPath.slice(0, -1) + '-' + (dupCounter++) + '/';
    }

    try {
      renameSync(this.projectFilePath + containerPath, destPath);
    } catch(err) {
      this.log.error(err.message, false);
      this.activity.stop('orphan-container');
      return false;
    }
    this.activity.stop('orphan-container');
    return true;
  }

  updateContainerLocation(obj: any, newIndicator: number): any | null {
    if (obj.containersLoading) {
      this.log.warn("Hold on, container information still loading")
      return null;
    }
    if (!obj.containers || !obj.containers[0]) {
      this.log.error("Couldn't move file to orphan directory because there is no container information available", false);
      return null;
    }
    if (this.projectFilePath === '') {
      return null;
    }

    this.activity.start('update-container-location');

    const newObject = JSON.parse(JSON.stringify(obj));
    const newObjectWithContainer = this.assignTitleAndContainer(newObject, newIndicator);

    const oldContainerPath = this.fullContainerPath(obj.containers[0]);
    const newContainerPath = this.fullContainerPath(newObjectWithContainer.containers[0]);

    try {
      if (existsSync(newContainerPath)) {
        throw new Error(`Directory '${newContainerPath}' already exists. Can't move files around`)
      }
      renameSync(oldContainerPath, newContainerPath);
      for (let file of newObjectWithContainer.files) {
        file.path = newContainerPath + file.name;
      }
    } catch(err) {
      console.error(err);
      this.log.error(err.message);
      this.activity.stop('update-container-location');
    }

    this.activity.stop('update-container-location');
    return newObjectWithContainer;
  }

  private assignTitleAndContainer(obj: any, newIndicator: number): any {
    let item = JSON.parse(JSON.stringify(obj));
    if ( !item.title || item.title.match(/^Item \d+$/) ) {
      item.title = 'Item ' + this.padLeft(newIndicator, 3, '0');
    }

    const containers = Array.from(item.containers);
    const container: any = containers[0];
    if (container.type_1.toLowerCase() === 'item') {
      item.containers[0].indicator_1 = newIndicator;
    }
    else if (container.type_2.toLowerCase() === 'item') {
      item.containers[0].indicator_2 = newIndicator;
    }
    else if (container.type_3.toLowerCase() === 'item') {
      item.containers[0].indicator_3 = newIndicator;
    }

    return item;
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

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
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

  public containerToPath(container: any): string {
    let returnString = '';
    let newContainer = container.filter((value) => {
      return value.type && value.type !== null;
    });
    for (let c of newContainer) {
      returnString += c.type + '_' + this.padLeft(c.indicator, 3, '0') + '/';
    }
    return returnString;
  }

  public updateFileAssignments(): Promise<any> {
    return new Promise((resolve, reject) => {
      for (let o of this.selectedObjects) {
        this.updateFileAssignment(o);
      }
      return resolve();
    });
  }

  public updateFileAssignment(obj: any) {
      if (this.projectFilePath === '') {
        return;
      }
  
      if (obj.containers.length === 1) {
        let containerPath = this.fullContainerPath(obj.containers[0]);
        try {
          const dirFiles = readdirSync(containerPath);
          obj.files = [];
          const files = dirFiles.filter((name) => {
            return (!(/(^|\/)\.[^\/\.]/g).test(name)) && name !== 'Thumbs.db';
          }).map((name) => {
            return containerPath + name;
          });
          this.addFilesToObject(obj, '', files);
        }
        catch (error) {
          this.log.warn("Missing container folder: " + containerPath, false);
          return;
        }
      }
  }

  private updateFileLocation(obj: any, file: File): boolean {
    if (!this.projectFilePath && !this.saveService.saveLocation) {
      this.log.warn("Couldn't move file into containers. Try saving the project first.");
      return false;
    }
    if (!obj.containers || !obj.containers[0]) {
      if (obj.containersLoading) {
        this.log.warn("Hold on, still waiting for container information to load");
        return false;
      }
      this.log.warn("Wait a tick, there doesn't appear to be any container information");
      return false;
    }

    let newFilename = this.filenameWithPurposeSuffix(file);
    let expectedFilePath = this.fullContainerPath(obj.containers[0]) + newFilename;

    if (expectedFilePath !== file.path) {
      if (existsSync(expectedFilePath)) {
        return false;
      }
      if (!existsSync(dirname(expectedFilePath))) {
        mkdirp.sync(dirname(expectedFilePath));
      }
      rename(file.path, expectedFilePath, (err) => {
        if (err) {
          if (err.message.indexOf("cross-device link not permitted") !== -1) {
            this.activity.start('file copy');
            this.copyFile(file.path, expectedFilePath)
              .then(() => {
                this.activity.stop('file copy');
                file.path = expectedFilePath;
              })
              .catch((err) => {
                this.activity.stop('file copy');
                this.log.error("Unable to copy file: " + err.message);
              });
          }
          else {
            this.log.error("Unable to move file: " + err.message);
          }
        }
        else {
          file.path = expectedFilePath;
        }
      });
    }
    return true;
  }

  private filenameWithPurposeSuffix(file: File): string {
    let info = parse(file.path);
    let purpose = info.name.substr(-3);
    if (purpose === '_pm' || purpose === '_mm' || purpose === '_ac') {
      info.name = info.name.slice(0, -3);
    }

    if (file.purpose === 'preservation') {
      info.name += '_pm';
    }
    if (file.purpose === 'modified-master') {
      info.name += '_mm';
    }
    if (file.purpose === 'access-copy') {
      info.name += '_ac';
    }

    return info.name + info.ext;
  }

  private copyFile(src: string, dest: string): Promise<any> {
    let ws = createWriteStream(dest);
    let rs = createReadStream(src);
    return new Promise(function(resolve, reject) {
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws);
    })
    .catch((err) => {
      rs.destroy();
      ws.end();
      return err;
    });
  }

}
