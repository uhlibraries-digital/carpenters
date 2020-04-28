import { Injectable, EventEmitter } from '@angular/core';
import { basename, dirname } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import * as mkdirp from 'mkdirp';

import { MapField } from 'app/classes/map-field';
import { File } from 'app/classes/file';

import { PreferencesService } from './preferences.service';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { ProgressBarService } from './progress-bar.service';
import { SaveService } from './save.service';
import { CsvService } from './csv.service';




@Injectable()
export class ModifiedMasterService {

  private preferences: any;
  private mapFields: MapField[];
  private location: string;
  private selectedObjects: any;

  private progressBarId: string;
  private totalProgress: number = 0;
  private barProgress: number = 0;

  mmComplete: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(
    private preferenceService: PreferencesService,
    private map: MapService,
    private log: LoggerService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private progress: ProgressBarService,
    private saveService: SaveService,
    private csv: CsvService,
  ){
    this.preferenceService.preferencesChange.subscribe((data) => {
      this.preferences = data;
      this.updateSettings();
    });
    this.preferences = this.preferenceService.data;
    this.updateSettings();
  }

  public async package(location: string, resource: any): Promise<any> {
    this.location = location;

    this.selectedObjects = this.asService.selectedArchivalObjects();
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    if (!this.selectedObjects || this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects/Standard Objects selected to export Modified Masters');
      return;
    }

    this.barProgress = 0;
    this.progressBarId = this.progress.newProgressBar(
      1,
      `Creating modified master package`
    );
    this.totalProgress = this.getTotalProgress();

    mkdirp.sync(`${location}/Files`);

    const fields = this.map.getMapFieldsAsList();
    const headers = ['parts'].concat(fields);
    let csvData = [headers];

    for (let obj of this.selectedObjects) {
      console.log('obj', obj);
      if (this.hasModifiedMasters(obj)) {
        this.progress.setDescription(this.progressBarId, `Getting metadata for ${obj.title}`);
        const objectRow = this.exportCsvMetadataRow(obj, headers);
        const fileRows = this.exportCsvFilesRows(obj, headers);
        csvData.push(objectRow);
        csvData = csvData.concat(fileRows);
        this.incrementProgressBar(1);

        await this.copyModifiedMasterFiles(obj);
      }
      else {
        this.incrementProgressBar(1);
        this.log.warn(`Item '${obj.title}' doesn't have modified master files`, false);
      }

    }

    this.progress.setDescription(this.progressBarId, `Creating metadata.csv`);
    await this.csv.write(`${this.location}/metadata.csv`, csvData);

    this.log.success('Done packaging Modified Masters');
    this.progress.clearProgressBar(this.progressBarId);
  }

  private async copyModifiedMasterFiles(obj: any): Promise<void> {
    const files = obj.files.filter(file => file.purpose === 'modified-master');
    for (let file of files) {
      this.progress.setDescription(this.progressBarId, `Copying file ${file.name}`);
      const filename = this.filePath(obj, file);
      await this.copyMmFile(file.path, `${this.location}/${filename}`);
      this.incrementProgressBar(1);
    }
  }

  private async copyMmFile(src: string, dest: string): Promise<any> {
    return new Promise((resolve, reject) => {
      mkdirp.sync(dirname(dest));
      const ws = createWriteStream(dest, { highWaterMark: Math.pow(2,20) });
      const rs = createReadStream(src, { highWaterMark: Math.pow(2,20) });

      ws.on('finish', () => {
        resolve();
      });
      rs.pipe(ws);
    });
  }

  private exportCsvMetadataRow(obj: any, headers: string[]): string[] {
    let objectRow = Array(headers.length).fill('');
    const fields = this.map.getMapFieldsAsList();
    this.setCsvRowValue(objectRow, 'parts', 'object', headers);
    fields.map((field) => {
      let value = obj.metadata[field] || ''
      if (field === 'dcterms.title' && value === '') {
        value = obj.title ||  ''
      }
      this.setCsvRowValue(objectRow, field, value, headers);
    });
    return objectRow;
  }

  private exportCsvFilesRows(obj: any, headers: string[]): string[] {
    const mm = obj.files.filter(file => file.purpose === 'modified-master');
    let rows = [];

    mm.map((file) => {
      let objectRow = Array(headers.length).fill('');
      objectRow[0] = this.filePath(obj, file);
      rows.push(objectRow);
    });
    return rows;
  }

  private filePath(obj: any, file: File): string {
    const container = this.convertFromASContainer(obj.containers[0]);
    const doArk = this.doArk(obj);
    const prefix = `${this.projectName().replace(' ', '_')}_${doArk}`;
    const filename = doArk ? file.exportFilename(prefix) : file.name;

    return `Files/${this.containerToPath(container)}${filename}`;
  }

  private setCsvRowValue(row: string[], field: string, value: string, headers: string[]): string[] {
    let index = headers.findIndex(col => col === field);
    if (index === -1) {
      return row;
    }
    row[index] = value;
    return row;
  }

  private getTotalProgress(): number {
    let total = this.selectedObjects.length;
    for (let obj of this.selectedObjects) {
      total += obj.files.filter(file => file.purpose === 'modified-master').length;
    }
    return total;
  }

  private incrementProgressBar(value: number): void {
    this.barProgress += value;
    let progress = this.barProgress / this.totalProgress;
    this.progress.setProgressBar(this.progressBarId, progress);
  }

  private hasModifiedMasters(obj: any): boolean {
    const mm = obj.files.filter(file => file.purpose === 'modified-master');
    return mm.length > 0;
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

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    if (value.length > length) { return value; }
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private convertFromASContainer(container: any): any {
    let rContainer = [];
    for (let i = 1; i <= 3; i++) {
      rContainer.push({
        type: container['type_' + i],
        indicator: container['indicator_' + i]
      });
    }
    return rContainer;
  }

  private updateSettings(): void {
    if (this.preferences.map.full) {
      this.map.getMapFields(this.preferences.map.full)
      .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Access Map');
        });
    }
  }

  private projectName(): string {
    return this.saveService.saveLocation ? 
      basename(this.saveService.saveLocation, '.carp') : 
      'untitled';
  }

  private doArk(obj: any): string {
    return obj.do_ark ?
      String(obj.do_ark.split('/').slice(-1)) :
      '';
  }

}