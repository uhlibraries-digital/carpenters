import { Injectable } from '@angular/core';
import {
  rename,
  writeFile,
  statSync,
  createReadStream,
  createWriteStream
} from 'fs';
import { basename } from 'path';
import * as mkdirp from 'mkdirp';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { ProgressBarService } from './progress-bar.service';
import { CsvService } from './csv.service';
import { SaveService } from './save.service';
import { GreensService } from './greens.service';
import { PreferencesService } from './preferences.service';
import { LocalStorageService } from './local-storage.service';

import { MapField } from 'app/classes/map-field';
import { File } from 'app/classes/file';
import { Erc } from 'app/classes/erc';

@Injectable()
export class SipService {

  private preferences: any;

  private selectedObjects: any;
  private selectedResource: any;
  private mapFields: MapField[];
  private location: string;
  private objectCount: number;

  private progressBarId: string;
  private totalProgress: number = 0;
  private barProgress: number = 0;

  constructor(
    private activity: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private saveService: SaveService,
    private map: MapService,
    private log: LoggerService,
    private csv: CsvService,
    private progress: ProgressBarService,
    private minter: GreensService,
    private preferenceService: PreferencesService,
    private storage: LocalStorageService) {

    this.preferenceService.preferencesChange.subscribe((data) => {
      this.preferences = data;
      this.updateSettings();
    });
    this.preferences = this.preferenceService.data;
    this.updateSettings();

    this.activity.finishedKey.subscribe((key) => {
      if (key === 'preservation') {
        this.log.info('Done packaging SIPs');
        this.progress.clearProgressBar(this.progressBarId);
      }
    });

    this.asService.selectedArchivalObjectsChanged.subscribe((objects) => {
      this.selectedObjects = objects;
    });
    this.standardItem.itemChanged.subscribe((objects) => {
      this.selectedObjects = objects;
    });
  }

  package(location: string, resource: any): Promise<any> {
    this.selectedResource = resource;
    this.location = location;

    if (!this.selectedObjects || this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects selected to export SIP');
      return;
    }

    this.objectCount = 0;
    this.barProgress = 0;
    this.progressBarId = this.progress.newProgressBar(
      1,
      'Creating preservation SIP' + (this.selectedObjects.length > 1 ? 's' : '')
    );

    this.totalProgress = this.getTotalProgress();

    let promisses = [];
    for (let object of this.selectedObjects) {
      promisses.push(this.createSip(object));
    }

    /* Once all the ARKs, if any, are minted save the project file */
    return Promise.all(promisses)
      .then(() => {
        this.saveProject();
      });
  }

  private saveProject(): void {
    if (this.saveService.saveLocation) {
      this.saveService.save();
    }
  }

  private getTotalProgress(): number {
    let total = this.selectedObjects.length;
    for (let obj of this.selectedObjects) {
      for (let file of obj.files) {
        total += file.size;
      }
    }
    return total;
  }

  private incrementProgressBar(value: number): void {
    this.barProgress += value;
    let progress = this.barProgress / this.totalProgress;
    this.progress.setProgressBar(this.progressBarId, progress);
  }

  private createSip(obj: any): Promise<any> {
    let mint = this.storage.get('mint_sip');
    if (mint && !obj.pm_ark) {
      return this.mintSip(obj)
        .then((ark) => {
          this.build(obj);
        });
    }
    else {
      this.build(obj);
      return Promise.resolve();
    }
  }

  private mintSip(obj: any): Promise<any> {
    let erc = new Erc(
      this.preferences.minter.ercWho,
      this.getObjectTitle(obj),
      '',
      this.preferences.minter.ercWhere
    );
    erc.when = erc.toTodayISOString();
    return this.minter.mint(erc)
      .then((id) => {
        if (erc.where.indexOf('$ark$') > -1) {
          erc.where = erc.where.replace('$ark$', id);
          this.minter.update(id, erc);
        }
        obj.pm_ark = id;
        return id;
      })
      .catch((e) => {
        this.log.error('Unable to mint identifier: ' + e.message);
      });
  }

  private build(obj: any) {
    if (obj.pm_ark) {
      this.log.success('Using SIP Ark: ' + obj.pm_ark + ' for ' + obj.title, false);
    }

    this.objectCount++;

    this.createDirectories(this.sipPath(obj), this.hasModifiedMasters(obj));
    this.createMetadataCsv(obj);
    this.copyObjectFiles(obj);

    this.incrementProgressBar(1);
  }

  private hasModifiedMasters(obj: any): boolean {
    let mm = obj.files.filter(file => file.purpose === 'modified-master');
    return mm.length > 0;
  }

  private sipPath(obj: any): string {
    let id = obj.pm_ark ?
      String(obj.pm_ark.split('/').slice(-1)) :
      this.padLeft(this.objectCount, 3, '0');
    return this.location + '/' + basename(this.location) + '_' + id;
  }

  private createMetadataCsv(obj: any): Promise<any> {
    let fields = this.map.getMapFieldsAsList();

    let headers = ['parts'].concat(fields);
    let csvData = [headers];

    let objectRow = Array(headers.length).fill('');
    this.setCsvRowValue(objectRow, 'parts', 'objects', headers);
    this.setCsvRowValue(objectRow, 'dcterms.title', this.getObjectTitle(obj), headers);
    this.setCsvRowValue(objectRow, 'dcterms.identifier', obj.pm_ark, headers);
    this.setCsvRowValue(objectRow, 'dcterms.isPartOf', this.selectedResource.title, headers);

    csvData.push(objectRow);

    let pmFiles = obj.files.filter(file => file.purpose === 'preservation');
    csvData = csvData.concat(this.getCsvFileRow(pmFiles, 'objects', csvData[0]));

    /**
     * I don't see where the service information must be included in the metadata.csv
     */
    //let mmFiles = obj.files.filter(file => file.purpose === 'modified-master');
    //csvData = csvData.concat(this.getCsvFileRow(mmFiles, 'service', csvData[0]));

    return this.csv.write(this.sipPath(obj) + '/metadata/metadata.csv', csvData);
  }

  private setCsvRowValue(row: string[], field: string, value: string, headers: string[]): string[] {
    let index = headers.findIndex(col => col === field);
    if (index === -1) {
      return row;
    }
    row[index] = value;
    return row;
  }

  private getCsvFileRow(files: File[], parts: string, headers: string[]): string[] {
    let fileRows = [];
    for (let file of files) {
      let fileRow = Array(headers.length).fill('');
      this.setCsvRowValue(fileRow, 'parts', parts + '/' + file.name, headers);
      fileRows.push(fileRow);
    }
    return fileRows;
  }

  private getObjectTitle(obj: any): string {
    let title = obj.title;
    if (obj.artificial) {
      let match = obj.title.match(/\d+$/);
      title = obj.parent.title + (match ? ' ' + match[0] : '');
    }

    return title;
  }

  private copyObjectFiles(obj: any): void {
    let pmFiles = obj.files.filter(file => file.purpose === 'preservation');
    let mmFiles = obj.files.filter(file => file.purpose === 'modified-master');
    let sdFiles = obj.files.filter(file => file.purpose === 'sub-documents');

    let path = this.sipPath(obj);
    this.copyFiles(pmFiles, path + '/objects');
    this.copyFiles(mmFiles, path + '/service');
    this.copyFiles(sdFiles, path + '/metadata/submissionDocumentation')
  }

  private copyFiles(files: File[], path: string): void {
    for (let file of files) {
      let filename = path + '/' + file.name;
      this.copyFile(file, filename);
    }
  }

  private copyFile(file: File, dest: string): void {
    this.activity.start('preservation');
    try {
      let ws = createWriteStream(dest);
      ws.on('finish', () => {
        this.log.success('Copied file ' + file.name + ' to ' + dest, false);
        this.activity.stop('preservation');
      });

      let rs = createReadStream(file.path);
      rs.on('data', (buffer) => {
        this.incrementProgressBar(buffer.length);
      });

      rs.pipe(ws);
    }
    catch(e) {
      this.activity.stop('preservation');
      this.log.error(e.message);
    }
  }

  private createDirectories(location: string, createServiceDir: boolean = false): boolean {
    try {
      mkdirp.sync(location + '/logs');
      mkdirp.sync(location + '/metadata/submissionDocumentation');
      mkdirp.sync(location + '/objects');
      if (createServiceDir) {
        mkdirp.sync(location + '/service');
      }
    } catch(e) {
      this.log.error('Failed to create directories: ' + e.message);
      return false;
    }
    return true;
  }

  private updateSettings(): void {
    if (this.preferences.map.archival) {
      this.map.getMapFields(this.preferences.map.archival)
        .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Archival Map');
        });
    }
    this.minter.setEndpoint(this.preferences.minter.endpoint, this.preferences.minter.prefix);
    this.minter.setApiKey(this.preferences.minter.key);
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }


}
