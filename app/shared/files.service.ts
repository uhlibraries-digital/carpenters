import { Injectable } from '@angular/core';
import { remote } from 'electron';
import { readdir } from 'fs';

import { ArchivesSpaceService } from './archivesspace.service';
import { LoggerService } from './logger.service';

import { File } from './file';

let { dialog } = remote;

@Injectable()
export class FilesService {

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
    let selectedObjects = this.asService.selectedArchivalObjects();
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
        this.log.success(file + ' added to archival object "' + found.title + '"');
      }
      else {
        this.log.warn("Couldn't find selected archival object for filename: " + file);
      }
    }
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
    if (c.type_1 !== container[0].type || c.indicator_1 !== container[0].indicator) {
      return false;
    }
    if (c.type_2 !== container[1].type || c.indicator_2 !== container[1].indicator) {
      return false;
    }
    if (c.type_3 !== container[2].type || c.indicator_3 !== container[2].indicator) {
      return false;
    }
    return true;
  }


}
