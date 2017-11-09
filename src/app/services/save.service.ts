import { Injectable, Output, EventEmitter }    from '@angular/core';
import { Router } from '@angular/router';

import {
  writeFile,
  readFile,
  existsSync
} from 'fs';
import { relative, dirname } from 'path';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';

import { File } from 'app/classes/file';
import { Item } from 'app/classes/item';

@Injectable()
export class SaveService {

  saveLocation: string;
  selectedResource: any;

  @Output() saveStatus: EventEmitter<boolean> = new EventEmitter();

  constructor(
    private activity: ActivityService,
    private router: Router,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private log: LoggerService,
    private electronService: ElectronService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
  }

  save(): void {
    if (!this.saveLocation) {
      this.saveLocation = this.saveDialog();
      if (!this.saveLocation) {
        return;
      }
    }

    this.activity.start('save');
    let saveObject = this.createSaveObject();
    this.saveToFile(saveObject, this.saveLocation);
  }

  open(): void {
    this.saveLocation = this.openDialog();
    if (!this.saveLocation) {
      return;
    }
    this.asService.clear();
    this.standardItem.clear();
    readFile(this.saveLocation, 'utf8', (err, data) => {
      if (err) {
        this.log.error('Error opening file: ' + err.message);
        throw err;
      }
      let saveObject = JSON.parse(data);
      this.loadObjects(saveObject);
      this.router.navigate([saveObject.type]);
    });
    this.saveStatus.emit(true);
  }

  changesMade() {
    this.saveStatus.emit(false);
  }

  saveLocationBasePath(): string {
    return this.saveLocation.match(/.*[/\\]/).toString();
  }

  fromProjectFile(): boolean {
    return !(this.saveLocation === undefined || this.saveLocation === '');
  }

  private openDialog(): string {
    let filenames = this.electronService.dialog.showOpenDialog({
      title: 'Open Project...',
      filters: [
        { name: 'Carpenters File', extensions: ['carp'] }
      ],
      properties: [
        'openFile'
      ]
    });
    return (filenames) ? filenames[0] : '';
  }

  private saveDialog(): string {
    return this.electronService.dialog.showSaveDialog({
      title: 'Save...',
      filters: [
        { name: 'Carpenters File', extensions: ['carp'] }
      ]
    });
  }

  private createSaveStandardObject(): any {
    let resource = this.standardItem.getResource();
    let standardObjects = this.standardItem.getAll();

    let objects = [];
    for (let so of standardObjects) {
      let files: any[] = so.files.map((file) => {
        return { path: file.path, purpose: file.purpose }
      });
      objects.push({
        title: so.title,
        containers: so.containers,
        level: so.level,
        productionNotes: so.productionNotes || '',
        pm_ark: so.pm_ark,
        files: files
      });
    }

    return ({
      type: 'standard',
      resource: resource,
      objects: objects
    });
  }

  private createSaveObject(): any {
    if(this.selectedResource === undefined) {
      return this.createSaveStandardObject();
    }

    let resource = this.selectedResource.uri;
    let archivalObjects = this.asService.selectedArchivalObjects();
    let objects = [];
    for (let ao of archivalObjects) {
      if (ao.files === undefined) { ao.files = []; }

      let files = ao.files.map((value) => {
        let path = relative(dirname(this.saveLocation), value.path);
        return { path: path, purpose: value.purpose };
      });
      let object: any = {
        uri: ao.record_uri,
        files: files,
        artificial: ao.artificial,
        productionNotes: this.getObjectProductionNotes(ao),
        pm_ark: ao.pm_ark
      };
      if (ao.artificial) {
        object.title = ao.title;
        object.parent_uri = ao.parent.record_uri;
        object.level = ao.level;
        object.containers = ao.containers;
      }
      objects.push(object);
    }

    return ({
      type: 'findingaid',
      resource: resource,
      objects: objects
    });
  }

  private getObjectProductionNotes(o: any): string {
    if (o.productionNotes) {
      return o.productionNotes;
    }
    if (o.parent) {
      return this.getObjectProductionNotes(o.parent);
    }
    return '';
  }

  private saveToFile(object: any, filename: string): void {
    let dataString = JSON.stringify(object);
    writeFile(filename, dataString, (err) => {
      this.saveStatus.emit(true);
      this.activity.stop('save');
      if (err) {
        this.log.error('Error saving file: ' + err.message);
      }
      else {
        this.log.success('Saved file: ' + this.saveLocation, false);
      }
    });
  }

  private loadObjects(obj: any): void {
    if (obj.type === 'findingaid') {
      this.asService.getResource(obj.resource)
        .then((resource) => {
          this.markSelections(obj.objects, this.selectedResource.tree.children);
          this.asService.selectedArchivalObjects();
          this.log.success('Loaded file: ' + this.saveLocation, false);
        });
    }
    else {
      this.loadStandardObjects(obj);
    }
  }

  private loadStandardObjects(obj: any): void {
    this.standardItem.setResourceTitle(obj.resource.title);
    for (let o of obj.objects) {
      let item: Item = o;
      item.files = this.convertToFileObjects(o.files);
      item.selected = true;
      item.productionNotes = o.productionNotes;
      item.pm_ark = o.pm_ark;
      this.standardItem.push(item);
    }
    this.log.success('Loaded file: ' + this.saveLocation, false);
  }

  private markSelections(selections: any, children: any): void {
    for (let c of children) {
      let found = selections.find((e) => {
        return e.uri === c.record_uri && !e.artificial;
      });
      if (found) {
        c.selected = true;
        c.productionNotes = found.productionNotes || '';
        c.pm_ark = found.pm_ark;
        c.files = this.convertToFileObjects(found.files);
      }

      let artificial = selections.filter(function(e) {
        return e.artificial && e.parent_uri === c.record_uri;
      });
      if (artificial.length > 0) {
        artificial = artificial.map((value) => {
          value.files = this.convertToFileObjects(value.files);
          value.selected = true;
          value.record_uri = undefined;
          value.children = [];
          value.parent = c;
          return value;
        });
        c.children = c.children.concat(artificial);
      }

      this.markSelections(selections, c.children);
    }
  }

  private convertToFileObjects(files: any[]): File[] {
    let mapFiles =  files.map((value) => {
      let path = value.path;
      value.path = dirname(this.saveLocation) + '/' + value.path;
      if (!existsSync(value.path)) {
        /* Backwards compatibility */
        value.path = path;
        if (!existsSync(value.path)) {
          this.log.error('File does not exist: ' + value.path);
          return null;
        }
      }
      let file = new File(value.path);
      file.setPurpose(value.purpose);
      return file;
    });

    return mapFiles.filter((value) => {
      return value !== null;
    });
  }

}
