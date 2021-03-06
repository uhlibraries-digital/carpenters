import { Injectable, EventEmitter } from '@angular/core';
import {
  rename,
  writeFile,
  statSync,
  createReadStream,
  createWriteStream,
  existsSync
} from 'fs';
import { createHash } from 'crypto';
import { basename, dirname } from 'path';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';

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

export enum ExportStatusType {
  Waiting,
  Processing,
  Done
}

export interface ExportStatus {
  projectLocation: string,
  exportLocation: string,
  objects: ExportStatusObject[]
}

export interface ExportStatusObject {
  uuid: string,
  status: ExportStatusType,
  location: string,
  ark: string
}

@Injectable()
export class SipService {

  private preferences: any;

  private selectedObjects: any;
  private selectedResource: any;
  private mapFields: MapField[];
  private location: string;
  private objectCount: number;
  private mintArks: boolean;

  private progressBarId: string;
  private totalProgress: number = 0;
  private barProgress: number = 0;
  private exportStatus: ExportStatus = null;

  sipComplete: EventEmitter<boolean> = new EventEmitter<boolean>();

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
  }

  public async package(location: string, resource: any): Promise<any> {
    this.selectedResource = resource;
    this.location = location;
    this.mintArks = this.storage.get('mint_sip');

    this.selectedObjects = this.asService.selectedArchivalObjects();
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    if (!this.selectedObjects || this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects/Standard Objects selected to export SIP');
      return;
    }

    this.objectCount = 0;
    this.barProgress = 0;
    this.progressBarId = this.progress.newProgressBar(
      1,
      'Checking for preservation files'
    );
    this.totalProgress = this.getTotalProgress();

    if (!this.isGoodToGo()) {
      this.log.error("Export failed, check log for more information");
      this.progress.clearProgressBar(this.progressBarId);
      return Promise.reject(Error("Export Failed"));
    }
    if (!this.hasDoArks()) {
      this.log.warn("This project contains objects without DO Arks");
    }

    this.progress.setDescription(this.progressBarId, `Creating preservation SIP${this.selectedObjects.length > 1 ? 's' : ''}`);

    this.log.info(
      `Creating SIP${this.selectedObjects.length > 1 ? 's' : ''}...`,
    false);

    if (!this.loadExportStatus()) {
      this.createExportStatus(location, this.selectedObjects);
    }
    else {
      this.log.info(`Continuing export at ${location}`, false);
    }

    for (let obj of this.selectedObjects) {
      if (this.hasPreservationFiles(obj)) {
        if (!obj.pm_ark) {
          obj.pm_ark = this.getExportStatusArk(obj.uuid);
        }
  
        if (!this.hasExported(obj.uuid)) {
          this.cleanupExportProcessing(obj.uuid);
          this.setExportStatusObject(obj.uuid, ExportStatusType.Processing);
  
          await this.createSip(obj);
          
          this.setExportStatusObject(obj.uuid, ExportStatusType.Done);
        }
        else {
          this.incrementProgressBar(this.getObjectTotalProgress(obj));
          this.log.success(`SIP already exported ${obj.pm_ark}`, false);
        }
      }
      else {
        this.incrementProgressBar(this.getObjectTotalProgress(obj));
        this.log.warn("Item '" + obj.title + "' doesn't have preservation files");
      }
    }

    this.saveProject();
    this.log.success('Done packaging SIPs');
    this.progress.clearProgressBar(this.progressBarId);
    this.sipComplete.emit(true);
    this.deleteExportStatus();
  }

  public loadExportStatus(): ExportStatus {
    const status = localStorage.getItem('exportStatus');
    this.exportStatus = JSON.parse(status) || null as ExportStatus;
    return this.exportStatus;
  }

  public deleteExportStatus(): void {
    localStorage.removeItem('exportStatus');
  }

  public completedExportStatus(): number[] {
    const done = this.exportStatus.objects.filter((obj) => {
      return obj.status === ExportStatusType.Done;
    });
    return [done.length, this.exportStatus.objects.length];
  }

  private isGoodToGo(): boolean {
    let gtg = true;
    for (let obj of this.selectedObjects) {
      if (this.hasPreservationFiles(obj)) {
        const files = obj.files.filter(file => file.purpose === 'preservation');
        for (let file of files) {
          if (!existsSync(file.path)) {
            this.log.error("Missing preservation file '" + file.path + "' for '" + obj.title + "' is missing");
            gtg = false;
          }
        }
      }
    }

    return gtg;
  }

  private hasPreservationFiles(obj: any) {
    const files = obj.files.filter(file => file.purpose === 'preservation');
    return files.length > 0
  }

  private hasDoArks(): boolean {
    const doFilter = this.selectedObjects.filter(obj => obj.do_ark === undefined || obj.do_ark === '');
    return doFilter.length === 0;
  }

  private saveProject(): void {
    if (this.saveService.saveLocation) {
      this.saveService.save();
    }
  }

  private projectName(): string {
    return this.saveService.saveLocation ? 
      basename(this.saveService.saveLocation, '.carp') : 
      'untitled';
  }

  private getTotalProgress(): number {
    let total = this.selectedObjects.length;
    for (let obj of this.selectedObjects) {
      total += this.getObjectTotalProgress(obj);
    }
    return total;
  }

  private getObjectTotalProgress(obj: any): number {
    let total = 0;
    let files = obj.files.filter(file => file.purpose !== 'access-copy');
    for (let file of files) {
      total += file.size * 2;
    }
    return total;
  }

  private incrementProgressBar(value: number): void {
    this.barProgress += value;
    let progress = this.barProgress / this.totalProgress;
    this.progress.setProgressBar(this.progressBarId, progress);
  }

  private async createSip(obj: any): Promise<any> {
    if (this.mintArks && !obj.pm_ark) {
      return this.mintSip(obj)
        .then(ark => this.build(obj))
        .catch((e) => {
          this.log.error('Failed to mint ark: ' + e + ' trying again...', false);
          return this.createSip(obj)
        });
    }
    else {
      return this.build(obj);
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
      });
  }

  private build(obj: any): Promise<any> {
    if (obj.pm_ark) {
      this.log.success('Using SIP Ark: ' + obj.pm_ark + ' for ' + this.getObjectTitle(obj), false);
    }
    this.objectCount++;

    this.setExportStatusLocation(obj.uuid, this.sipPath(obj));
    this.setExportStatusArk(obj.uuid, obj.pm_ark);

    this.createDirectories(this.sipPath(obj));
    this.createMetadataCsv(obj);

    return this.copyObjectFiles(obj)
      .then(() => {
        this.incrementProgressBar(1);
      });
  }

  // private hasModifiedMasters(obj: any): boolean {
  //   let mm = obj.files.filter(file => file.purpose === 'modified-master');
  //   return mm.length > 0;
  // }

  private sipPath(obj: any): string {
    let id = this.sipId(obj);
    return this.location + '/' + basename(this.location) + '_' + id;
  }

  private sipId(obj: any): string {
    return obj.pm_ark ?
      String(obj.pm_ark.split('/').slice(-1)) :
      this.padLeft(this.objectCount, 3, '0');
  }

  private doArk(obj: any): string {
    return obj.do_ark ?
      String(obj.do_ark.split('/').slice(-1)) :
      '';
  }

  private createMetadataCsv(obj: any): Promise<any> {
    this.log.info('Creating metadata.csv for ' + this.getObjectTitle(obj), false);

    let sipId = this.sipId(obj);
    let fields = this.map.getMapFieldsAsList();

    let headers = ['parts'].concat(fields).concat(['uhlib.doUuid', 'partOfAIC']);
    let csvData = [headers];

    let objectRow = Array(headers.length).fill('');
    this.setCsvRowValue(objectRow, 'parts', 'objects/' + sipId, headers);
    this.setCsvRowValue(objectRow, 'dcterms.title', this.getObjectTitle(obj), headers);
    this.setCsvRowValue(objectRow, 'dc.date', this.getObjectDate(obj), headers);
    this.setCsvRowValue(objectRow, 'dcterms.identifier', obj.pm_ark, headers);
    this.setCsvRowValue(objectRow, 'dcterms.isPartOf', this.selectedResource.collectionArk || '', headers);
    this.setCsvRowValue(objectRow, 'uhlib.note', this.selectedResource.vocabTitle || '', headers);
    this.setCsvRowValue(objectRow, 'uhlib.aSpaceUri', this.getObjectUri(obj), headers);
    this.setCsvRowValue(objectRow, 'uhlib.doUuid', obj.uuid, headers);
    this.setCsvRowValue(objectRow, 'partOfAIC', this.selectedResource.aic, headers);

    csvData.push(objectRow);

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

  private getObjectDate(obj: any): string {
    if (!obj.dates) { return ''; }

    let dates = obj.dates.map(d => d.begin + (d.end ? '/' + d.end : ''));
    return dates.join('; ');
  }

  private copyObjectFiles(obj: any): Promise<any> {
    this.log.info('Copying files for ' + this.getObjectTitle(obj), false);
    let promisses = [];

    let pmFiles = obj.files.filter(file => file.purpose === 'preservation');
    //let mmFiles = obj.files.filter(file => file.purpose === 'modified-master');
    let sdFiles = obj.files.filter(file => file.purpose === 'sub-documents');

    let path = this.sipPath(obj);
    mkdirp.sync(path + '/objects/' + this.sipId(obj));
    // if (mmFiles && mmFiles.length > 0) {
    //   mkdirp.sync(path + '/service/' + this.sipId(obj));
    // }

    const prefix = `${this.projectName().replace(' ', '_')}_${this.doArk(obj)}`;

    promisses.push(this.copyFiles(pmFiles, path + '/objects/' + this.sipId(obj), prefix));
    //promisses.push(this.copyFiles(mmFiles, path + '/service/' + this.sipId(obj), prefix));
    promisses.push(this.copyFiles(sdFiles, path + '/metadata/submissionDocumentation', prefix));

    return Promise.all(promisses);
  }

  private copyFiles(files: File[], path: string, prefix?: string): Promise<any> {
    let promisses = [];
    for (let file of files) {
      const filename = `${path}/${file.exportFilename(prefix)}`
      promisses.push(
        this.copyFile(file, filename)
          .then((checksum) => {
            return this.validateFileCopy(file, filename, checksum);
          })
      );
    }

    return Promise.all(promisses);
  }

  private copyFile(file: File, dest: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let checksum = '';
        let hash = createHash('sha1');

        if (!existsSync(file.path)) {
          throw Error('File does not exist: ' + file.path);
        }

        let ws = createWriteStream(dest, { highWaterMark: Math.pow(2,20) });
        ws.on('finish', () => {
          resolve(checksum);
        });

        let rs = createReadStream(file.path, { highWaterMark: Math.pow(2,20) });
        rs.on('data', (buffer) => {
          hash.update(buffer, 'utf8');
          this.incrementProgressBar(buffer.length);
        });
        rs.on('end', () => {
          checksum = hash.digest('hex');
        });

        rs.pipe(ws);
      }
      catch(e) {
        this.log.error(e.message);
        reject(e);
      }
    });
  }

  private createDirectories(location: string, createServiceDir: boolean = false): boolean {
    rimraf.sync(location);
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

  private validateFileCopy(file: File, newFilePath: string, checksum: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.log.info('Checking file ' + newFilePath, false);

      if (!existsSync(newFilePath)) {
        this.log.error("Validation failed, file doesn't exist: " + newFilePath);
        reject();
      }

      let hash = createHash('sha1');
      let rs = createReadStream(newFilePath);

      rs.on('data', (data) => {
        hash.update(data, 'utf8');
        this.incrementProgressBar(data.length);
      });
      rs.on('end', () => {
        let copiedChecksum = hash.digest('hex');
        if (checksum !== copiedChecksum) {
          this.log.error('Export file ' + file.name + ' failed checksum. ' +
            'Expected ' + checksum + ' but got ' + copiedChecksum);
          reject();
        }
        else {
          this.log.success('Copied file ' + file.name + ' to ' + dirname(newFilePath), false);
          resolve();
        }
      });
    });
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
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
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

  private createExportStatus(location: string, objects: any): void {
    const exportObjects: ExportStatusObject[] = objects.map((obj) => {
      return {
        uuid: obj.uuid,
        status: ExportStatusType.Waiting,
        location: '',
        ark: ''
      } ;
    });

    this.exportStatus = {
      projectLocation: this.saveService.saveLocation,
      exportLocation: location,
      objects: exportObjects
    }
    localStorage.setItem('exportStatus', JSON.stringify(this.exportStatus));
  }

  private setExportStatusObject(uuid: string, status: ExportStatusType): void {
    const objects = Array.from(this.exportStatus.objects);
    const i = objects.findIndex(obj => obj.uuid === uuid);
    
    if (i === -1) { 
      return
    }

    objects[i].status = status;
    this.exportStatus.objects = objects;
    localStorage.setItem('exportStatus', JSON.stringify(this.exportStatus));
  }

  private hasExported(uuid: string): boolean {
    const object = this.getExportObject(uuid);
    if (!object) {
      return false;
    }
    return object.status === ExportStatusType.Done &&
      existsSync(object.location);
  }

  private setExportStatusLocation(uuid: string, location: string): void {
    const objects = Array.from(this.exportStatus.objects);
    const i = objects.findIndex(obj => obj.uuid === uuid);
    if (i === -1) {
      return;
    }

    objects[i].location = location;
    this.exportStatus.objects = objects;
    localStorage.setItem('exportStatus', JSON.stringify(this.exportStatus));
  }

  private setExportStatusArk(uuid: string, ark: string): void {
    const objects = Array.from(this.exportStatus.objects);
    const i = objects.findIndex(obj => obj.uuid === uuid);
    if (i === -1) {
      return;
    }

    objects[i].ark = ark;
    this.exportStatus.objects = objects;
    localStorage.setItem('exportStatus', JSON.stringify(this.exportStatus));
  }

  private getExportStatusArk(uuid: string): string {
    const object = this.getExportObject(uuid);
    return object.ark || '';
  }

  private cleanupExportProcessing(uuid: string): void {
    const object = this.getExportObject(uuid);
    if (!object) {
      return;
    }

    if (object.status === ExportStatusType.Processing && object.location !== '') {
      rimraf.sync(object.location);
    }
  }

  private getExportObject(uuid: string): ExportStatusObject {
    return this.exportStatus.objects.find(obj => obj.uuid === uuid) || null;
  }
}
