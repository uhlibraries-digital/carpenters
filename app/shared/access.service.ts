import { Injectable } from '@angular/core';
import { renameSync } from 'fs';
import { writeFile } from 'fs';
import * as mkdirp from 'mkdirp';

import { ArchivesSpaceService } from './archivesspace.service';
import { LocalStorageService } from './local-storage.service';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { CsvService } from './csv.service';

import { MapField } from './map-field';
import { File } from './file';

@Injectable()
export class AccessService {

  private selectedObjects: any;
  private selectedResource: any;
  private mapFields: MapField[];
  private location: string;
  private csvData: any[];
  private csvHeader: any[];

  constructor(
    private asService: ArchivesSpaceService,
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

    this.log.info('Creating DIP...', false);
    mkdirp.sync(this.location + '/objects');

    this.process(this.selectedObjects);
  }

  loadMap(): void {
    let accessMap = this.storage.get('preferences').map.full;
    if (accessMap) {
      this.map.getMapFields(accessMap)
        .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Access Map');
        });
    }
  }

  private process(objects: any[]): void {
    let csv = [];
    this.csvHeader = this.getCsvHeader();

    csv.push(this.csvHeader);
    csv.push(this.processResource());
    csv = csv.concat(this.processObjects(objects));

    this.log.info('Writting DIP metadata.csv', false);
    this.csv.write(this.location + '/metadata.csv', csv);
    this.log.info('Done packaging DIP');
  }

  private getCsvHeader(): string[] {
    let fields = this.map.getMapFieldsAsList();
    return ['file_path'].concat(fields);
  }

  private processObjects(objects: any[]): any[] {
    let csv = [];
    let objectIndex = 0;
    for (let object of objects) {
      let row = this.buildRow();
      let dirName = 'objects/' + this.asService.padLeft(++objectIndex, 3, '0');
      mkdirp.sync(this.location + '/' + dirName);
      row[0] = dirName;

      this.setCsvRowColumn(row, 'uhlib.aSpaceUri', this.getObjectUri(object));

      csv.push(row);
      this.processFiles(csv, object, dirName);
    }
    return csv;
  }

  private processResource(): any[] {
    let row = this.buildRow();
    row[0] = 'objects';
    this.setCsvRowColumn(row, 'dcterms.title', this.selectedResource.title);
    return row;
  }

  private getIndexOfHeader(header: string): number {
    return this.csvHeader.indexOf(header);
  }

  private buildRow(): string[] {
    let row = [];
    for ( let i = 0; i < this.csvHeader.length; i++) {
      row.push('');
    }
    return row;
  }

  private setCsvRowColumn(row: string[], header: string, value: string): void {
    let index = this.getIndexOfHeader(header);
    if (index > -1) {
      row[index] = value;
    }
  }

  private getObjectUri(o: any): string {
    if (o.record_uri) {
      return o.record_uri;
    }
    if (o.parent) {
      return this.getObjectUri(o.parent);
    }
    return '';
  }

  private processFiles(csv: any[], object: any, dirName: string): void {
    let accessFiles = object.files.filter((file) => {
      return file.purpose === 'access-copy';
    });
    for (let file of accessFiles) {
      let row = this.buildRow();
      let filename = dirName + '/' + file.name;
      row[0] = filename;
      this.moveFile(file, this.location + '/' + filename);
      csv.push(row);
    }
  }

  private moveFile(file: File, dest: string): boolean {
    try {
      renameSync(file.path, dest);
      file.path = dest;
      this.log.success('Moved file ' + file.name + ' to ' + dest, false);
    }
    catch(e) {
      this.log.error(e.message);
      return false;
    }
    return true;
  }

}
