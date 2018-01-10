import { Injectable, EventEmitter } from '@angular/core';
import { readdir, statSync, existsSync } from 'fs';
import * as mkdirp from 'mkdirp';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';
import { WatchService } from './watch.service';

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
    private watch: WatchService,
    private electronService: ElectronService) {

    this.asService.selectedArchivalObjectsChanged.subscribe((objects) => {
      this.selectedObjects = objects;
      if (this.filesWatchFirstRun && objects.length > 0) {
        this.filesWatchFirstRun = false;
        this.updateFileAssignments(this.projectFilePath);
      }
    });
    this.standardItem.itemChanged.subscribe((objects) => {
      this.selectedObjects = objects;
      if (this.filesWatchFirstRun && objects.length > 0) {
        this.filesWatchFirstRun = false;
        this.updateFileAssignments(this.projectFilePath);
      }
    });

    this.watch.hierarchyChanged.subscribe((path) => {
      this.projectFilePath = path;
      this.updateFileAssignments(path);
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
      this.removeFileFromObjects(newFile);
      obj.files.push(newFile);
    }
    obj.files.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
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

  createFolderHierarchy(path: string): void {
    for (let o of this.selectedObjects) {
        if (o.containers.length === 1) {
          let container = this.convertFromASContainer(o.containers[0]);
          let containerPath = path + '/Files/' + this.containerToPath(container);
          mkdirp.sync(containerPath);
        }
    }
    if (existsSync(path + '/Files')) {
      this.watch.fileHierarchy(path + '/Files');
    }
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

  private clearFiles(objects: any[]) {
    for (let o of objects) {
      o.files = [];
    }
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
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

  private containerToString(container: any): string {
    let returnString = '';
    let newContainer = container.filter((value) => {
      return value.type !== null;
    });
    for (let c of newContainer) {
      returnString += c.type + ' ' + c.indicator + ', ';
    }
    return returnString.slice(0, -2);
  }

  private containerToPath(container: any): string {
    let returnString = '';
    let newContainer = container.filter((value) => {
      return value.type && value.type !== null;
    });
    for (let c of newContainer) {
      returnString += c.type + '_' + this.padLeft(c.indicator, 3, '0') + '/';
    }
    return returnString;
  }

  private updateFileAssignments(projectFilePath: string): void {
    if (projectFilePath === '') {
      this.filesWatchFirstRun = true;
      return;
    }

    for (let o of this.selectedObjects) {
      if (o.containers.length === 1) {
        let container = this.convertFromASContainer(o.containers[0]);
        let containerPath = projectFilePath + '/' + this.containerToPath(container);
        readdir(containerPath, (err, files) => {
          if (err) {
            this.log.warn("Missing container folder: " + containerPath, false);
            return;
          }

          o.files = [];
          files = files.filter((name) => {
            return (!(/(^|\/)\.[^\/\.]/g).test(name)) && name !== 'Thumbs.db';
          }).map((name) => {
            return containerPath + name;
          });
          this.addFilesToObject(o, '', files);
        });
      }
    }
  }

}
