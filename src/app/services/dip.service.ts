import { Injectable } from '@angular/core';
import {
  rename,
  writeFile,
  statSync,
  createReadStream,
  createWriteStream,
  existsSync
} from 'fs';
import { basename, dirname } from 'path';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { MapService } from './map.service';
import { PreferencesService } from './preferences.service';
import { ProgressBarService } from './progress-bar.service';
import { LoggerService } from './logger.service';
import { CsvService } from './csv.service';

import { MapField } from 'app/classes/map-field';
import { File } from 'app/classes/file';

@Injectable()
export class DipService {

  private preferences: any;
  private selectedObjects: any;
  private selectedResource: any;
  private mapFields: MapField[];
  private location: string;
  private csvData: any[];
  private csvHeader: any[];

  private progressBarId: string;
  private totalProgress: number = 0;
  private fileProgress: number[];

  constructor(
    private activity: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private preferenceService: PreferencesService,
    private map: MapService,
    private log: LoggerService,
    private csv: CsvService,
    private progress: ProgressBarService) {

    this.preferenceService.preferencesChange.subscribe((data) => {
      this.preferences = data;
      this.loadMap();
    })
    this.preferences = this.preferenceService.data;
    this.loadMap();

    this.activity.finishedKey.subscribe((key) => {
      if (key === 'access') {
        this.log.info('Done packaging DIP');
        this.progress.clearProgressBar(this.progressBarId);
        this.progressBarId = undefined;
      }
    });
  }

  package(location: string, resource: any): void {
    this.selectedResource = resource;
    this.location = location;
    this.selectedObjects = this.asService.selectedArchivalObjects();
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    if (this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects selected to export DIP');
      return;
    }

    this.totalProgress = 0;
    this.fileProgress = [];

    if (this.progressBarId) {
      this.progress.setDescription(this.progressBarId, 'Creating access DIP');
    }
    else {
      this.createProgressBar('Creating access DIP');
    }

    this.log.info('Creating DIP...', false);
    rimraf.sync(this.location + '/objects');
    mkdirp.sync(this.location + '/objects');

    this.process(this.selectedObjects);
  }

  loadMap(): void {
    let accessMap: string;
    try {
      accessMap = this.preferences.map.full;
    }
    catch(e) { return; }
    if (accessMap) {
      this.map.getMapFields(accessMap)
        .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Access Map');
        });
    }
  }

  createProgressBar(description: string): void {
    this.progressBarId = this.progress.newProgressBar(1, description);
  }

  private process(objects: any[]): void {
    this.activity.start('access');
    let csv = [];
    this.csvHeader = this.getCsvHeader();

    csv.push(this.csvHeader);
    csv.push(this.processResource());
    csv = csv.concat(this.processObjects(objects));

    this.log.info('Writting DIP metadata.csv', false);
    this.csv.write(this.location + '/metadata.csv', csv)
      .then(() => {
        this.activity.stop('access');
      });
  }

  private getCsvHeader(): string[] {
    let fields = this.map.getMapFieldsAsList();
    return ['file_path'].concat(fields.concat(['productionNotes']));
  }

  private processObjects(objects: any[]): any[] {
    let csv = [];
    let objectIndex = 0;
    for (let object of objects) {
      let row = this.buildRow();
      let dirName = 'objects/' + this.asService.padLeft(++objectIndex, 3, '0');
      mkdirp.sync(this.location + '/' + dirName);
      row[0] = dirName;

      this.setCsvRowColumn(row, 'dcterms.source', object.pm_ark);
      this.setCsvRowColumn(row, 'uhlib.aSpaceUri', this.getObjectUri(object));
      this.setCsvRowColumn(row, 'productionNotes', this.getObjectProductionNotes(object));

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

  private getObjectProductionNotes(o: any): string {
    if (o.productionNotes) {
      return o.productionNotes;
    }
    if (o.parent) {
      return this.getObjectProductionNotes(o.parent);
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
      this.copyFile(file.path, this.location + '/' + filename);
      csv.push(row);
    }
  }

  private moveFile(src: string, dest: string): void {
    this.activity.start('access');
    this.totalProgress++;
    rename(src, dest, (err) => {
      if (err) {
        this.activity.stop('access');
        this.log.error('Failed to move file ' + src + ' to ' + dest);
        this.log.error(err.message, false);
        return;
      }

      this.fileProgress[src] = 1;
      let sum = Object.keys(this.fileProgress).reduce((sum, key) => {
        return sum + this.fileProgress[key];
      }, 0);
      this.progress.setProgressBar(this.progressBarId, sum / this.totalProgress);
      this.activity.stop('access');
      this.log.success('Moved file ' + src + ' to ' + dest, false);
    });
  }

  private copyFile(src: string, dest: string): void {
    this.activity.start('access');
    try {
      let stat = statSync(src);
      this.totalProgress += stat.size;
      this.fileProgress[src] = 0;

      let ws = createWriteStream(dest);
      ws.on('finish', () => {
        this.log.success('Copied file ' + basename(src) + ' to ' + dirname(dest), false);
        this.activity.stop('access');
      });

      let rs = createReadStream(src);
      rs.on('data', (buffer) => {
        this.fileProgress[src] += buffer.length;
        let sum = 0;
        for (let psum in this.fileProgress) {
          sum += this.fileProgress[psum];
        }
        this.progress.setProgressBar(this.progressBarId, sum / this.totalProgress);
      });

      rs.pipe(ws);
    }
    catch(e) {
      this.activity.stop('access');
      this.log.error(e.message);
    }
  }

}
