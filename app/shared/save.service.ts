import { Injectable, Output, EventEmitter }    from '@angular/core';
import { remote } from 'electron';
import { writeFile } from 'fs';
import { readFile } from 'fs';

import { ArchivesSpaceService } from './archivesspace.service';

import { File } from './file';

let { dialog } = remote;

@Injectable()
export class SaveService {

  saveLocation: string;
  selectedResource: any;

  @Output() saveStatus: EventEmitter<boolean> = new EventEmitter();

  constructor(
    private asService: ArchivesSpaceService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
  }

  save(): void {
    if (!this.saveLocation) {
      this.saveLocation = this.saveDialog();
      if (!this.saveLocation) {
        return;
      }
    }

    let saveObject = this.createSaveObject();
    this.saveToFile(saveObject, this.saveLocation);
    this.saveStatus.emit(true);
  }

  open(): void {
    this.saveLocation = this.openDialog();
    if (!this.saveLocation) {
      return;
    }

    readFile(this.saveLocation, 'utf8', (err, data) => {
      if (err) {
        dialog.showErrorBox('Error opening file', err.message);
        throw err;
      }
      let saveObject = JSON.parse(data);
      this.loadObjects(saveObject);
    });
    this.saveStatus.emit(true);
  }

  changesMade() {
    this.saveStatus.emit(false);
  }

  private openDialog(): string {
    let filenames = dialog.showOpenDialog({
      title: 'Open Project...',
      filters: [
        { name: 'Carpetners File', extensions: ['json'] }
      ],
      properties: [
        'openFile'
      ]
    });
    return (filenames) ? filenames[0] : '';
  }

  private saveDialog(): string {
    return dialog.showSaveDialog({
      title: 'Save...',
      filters: [
        { name: 'Carpenters File', extensions: ['json'] }
      ]
    });
  }

  private createSaveObject(): any {
    let resource = this.selectedResource.uri;
    let archivalObjects = this.asService.selectedArchivalObjects();
    let objects = [];
    for (let ao of archivalObjects) {
      let files = ao.files.map((value) => {
        return { path: value.path, purpose: value.purpose };
      });
      let object: any = {
        uri: ao.record_uri,
        files: files,
        artificial: ao.artificial
      };
      if (ao.artificial) {
        object.title = ao.title;
        object.parent_uri = ao.parent.record_uri;
      }
      objects.push(object);
    }

    return ({
      resource: resource,
      objects: objects
    });
  }

  private saveToFile(object: any, filename: string): void {
    let dataString = JSON.stringify(object);
    writeFile(filename, dataString), (err) => {
      if (err) {
        dialog.showErrorBox('Error saving file', err.message);
      }
    }
  }

  private loadObjects(obj: any): void {
    this.asService.getResource(obj.resource)
      .then((resource) => {
        this.markSelections(obj.objects, this.selectedResource.tree.children);
      });
  }

  private markSelections(selections: any, children: any): void {
    for (let c of children) {
      let found = selections.find(function(e){
        return e.uri === c.record_uri && !e.artificial;
      });
      if (found) {
        c.selected = true;
        c.files = this.convertToFileObjects(found.files);
      }

      let artificial = selections.filter(function(e) {
        return e.artificial && e.parent_uri === c.record_uri;
      });
      if (artificial.length > 0) {
        artificial = artificial.map(function(value) {
          value.files = this.convertToFileObjects(value.files);
          value.selected = true;
          value.containers = c.containers;
          value.record_uri = undefined;
          value.children = [];
          value.parent = c;
          value.level = c.level;
          return value;
        });
        c.children = c.children.concat(artificial);
      }

      this.markSelections(selections, c.children);
    }
  }

  private convertToFileObjects(files: any[]): File[] {
    return files.map((value) => {
      let file = new File(value.path);
      file.setPurpose(value.purpose);
      return file;
    });
  }

}
