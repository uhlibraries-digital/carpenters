import { Injectable } from '@angular/core';
import { renameSync } from 'fs';
import { writeFile } from 'fs';
import * as mkdirp from 'mkdirp';

import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LocalStorageService } from './local-storage.service';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { CsvService } from './csv.service';

import { MapField } from './map-field';
import { File } from './file';

@Injectable()
export class PreservationService {

  private selectedObjects: any;
  private selectedResource: any;
  private mapFields: MapField[];
  private location: string;
  private hierarchySquances: any;

  constructor(
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private storage: LocalStorageService,
    private map: MapService,
    private log: LoggerService,
    private csv: CsvService) {

    this.storage.changed.subscribe((key) => {
      if (key === 'preferences') {
        this.loadMap();
      }
    });
    this.loadMap();
  }

  package(location: string, resource: any): void {
    this.selectedResource = resource;
    this.location = location;
    this.selectedObjects = this.asService.selectedArchivalObjects();
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    if (this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects selected to export SIP');
      return;
    }

    this.log.info('Creating SIP...', false);
    this.addFilePaths(this.selectedObjects);

    this.log.info('Creating directories', false);
    if (!this.createDirectories()) {
      this.log.error('Failed packaging SIP');
      return;
    }
    let partsPaths = this.processFiles(this.selectedObjects);

    this.log.info('Creating SIP metadata.csv', false);
    this.createCsv(partsPaths);

    this.log.info('Done packaging SIP');

    let logFilename = this.location + '/metadata/submissionDocumentation/' +
      'carpenters-' + this.log.toTodayISOString() + '.log';
    writeFile(logFilename, this.log.toString());
  }

  private processFiles(objects: any): string[] {
    let rows = [];
    for (let o of objects) {
      let preservationFiles = o.files.filter((file) => {
        return file.purpose === 'preservation';
      });
      let modifiedFiles = o.files.filter((file) => {
        return file.purpose === 'modified-master';
      });

      if (preservationFiles.length > 0) {
        let path = 'objects/pm/' + o.path;
        rows.push(path);
        rows = rows.concat(this.moveFiles(preservationFiles, path));
      }
      if (modifiedFiles. length > 0) {
        let path = 'objects/mm/' + o.path;
        rows.push(path);
        rows = rows.concat(this.moveFiles(modifiedFiles, path));
      }
    }
    rows.sort();
    return rows;
  }

  private moveFiles(files: File[], path: string): any[] {
    let rows = [];
    mkdirp.sync(this.location + '/' + path);
    for (let file of files) {
      let filename = this.location + '/' + path + file.name;
      if (this.moveFile(file.path, filename)) {
        rows.push(path + file.name);
        file.path = filename;
        this.log.success('Moved file ' + file.name + ' to ' + filename, false);
      }
    }
    return rows;
  }

  private moveFile(src: string, dest: string): boolean {
    try {
      renameSync(src, dest);
    }
    catch(e) {
      this.log.error(e.message);
      return false;
    }
    return true;
  }

  private createDirectories(): boolean {
    try {
      mkdirp.sync(this.location + '/logs');
      mkdirp.sync(this.location + '/metadata/submissionDocumentation');
      mkdirp.sync(this.location + '/objects');
    } catch(e) {
      this.log.error('Failed to create directories: ' + e.message);
      return false;
    }
    return true;
  }

  private addFilePaths(objects: any) {
    this.hierarchySquances = {};
    for( let o of objects) {
        let flatstruct = [];
        this.buildFlatStructure(o, flatstruct);
        o.path = this.getPathFromFlatStructure(flatstruct);
    }
  }

  private buildFlatStructure(o: any, flatstruct: any[]): any {
    let node = {
      object: o,
      title: o.title,
      id: (o.id) ? o.id : o.index
    }
    if (o.parent) {
      this.buildFlatStructure(o.parent, flatstruct);
    }
    if (o.files || this.asService.isSeriesType(o.level)) {
      flatstruct.push(node);
    }
    return node;
  }

  private getPathFromFlatStructure(struct: any[]): string {
    let path: string = '';
    for (let s of struct) {
      let level = s.object.level.toLowerCase();
      if (level === 'series') {
        path += 's' + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else if (level === 'subseries') {
        path += 'ss' + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else if (level.indexOf('sub-series') > -1) {
        let subCount = level.split('sub-').length;
        let sssPrefix = Array(subCount + 1).join('s');
        path += sssPrefix + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else {
        if (!(path in this.hierarchySquances)) {
          this.hierarchySquances[path] = 0;
        }
        this.hierarchySquances[path] += 1;
        let ark = this.selectedResource.sip_ark || '';
        let dirName = this.asService.padLeft(this.hierarchySquances[path], 3, '0');
        if (ark !== '') {
          dirName += '_' + String(ark.split('/').slice(-1));
        }
        path += dirName + '/';
      }
    }
    return path;
  }

  private createCsv(partsPaths: string[]) {
    let fields = this.map.getMapFieldsAsList();

    /** Creating a array of empty strings for map fields */
    let fieldsTemplateArray = [];
    for ( let i = 0; i < fields.length; i++) {
      fieldsTemplateArray.push('');
    }

    let csvData = [['parts'].concat(fields)];

    /**
     Add collection metadata
     STILL NEEDS WORK TO CROSSWALK ASPACE TERMS TO THE MAP FIELDS
    */
    let titleIndex = fields.indexOf('dcterms.title');
    let identifierIndex = fields.indexOf('dcterms.identifier');
    let collection = ['objects'].concat(fieldsTemplateArray);
    if (titleIndex > -1) {
      collection[titleIndex + 1] = this.selectedResource.title || '';
    }
    if (identifierIndex > -1) {
      collection[identifierIndex + 1] = this.selectedResource.sip_ark || '';
    }
    csvData.push(collection);

    for (let parts of partsPaths) {
      csvData.push([parts].concat(fieldsTemplateArray));
    }

    this.csv.write(this.location + '/metadata/metadata.csv', csvData);
  }

  loadMap(): void {
    let archivalMap: string;
    try {
      archivalMap = this.storage.get('preferences').map.archival;
    }
    catch (e) { return; }
    if (archivalMap) {
      this.map.getMapFields(archivalMap)
        .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Archival Map');
        });
    }
  }


}
