import { Injectable } from '@angular/core';
import { renameSync } from 'fs';
import * as mkdirp from 'mkdirp';

import { LoggerService } from '../shared/logger.service';
import { CsvService } from '../shared/csv.service';
import { MapService } from '../shared/map.service';

import { DigitalObject } from './digital-object';
import { File } from './file';

@Injectable()
export class SipService {

  workingDir: string;
  digitalObjects: DigitalObject[];
  identifier: string;
  csvData: any[];

  constructor(
    private logger: LoggerService,
    private csvService: CsvService,
    private map: MapService) {
  }

  create(digitalObjects: DigitalObject[], workingDir: string): void {
    this.workingDir = workingDir;
    this.digitalObjects = digitalObjects;

    this.logger.info('Creating SIP...');
    this.workingDir += digitalObjects[0].path;
    this.identifier = digitalObjects[0].metadata['dcterms.identifier'] || '';

    if (!this.createDir(this.workingDir)) {
      return;
    }

    this.logger.info('Creating directories');
    this.createDir(this.workingDir + '/logs');
    this.createDir(this.workingDir + '/metadata/submissionDocumentation');
    this.createDir(this.workingDir + '/objects');

    this.csvData = [];
    this.addCsvHeader();

    this.addIdentiferToObjectPath();
    this.processObjects();
    this.logger.info('Creating SIP metadata.csv');
    this.csvService.write(this.workingDir + '/metadata/metadata.csv', this.csvData);
    this.logger.info('Done packaging SIP');
  }

  createDir(path: string): boolean {
    mkdirp.sync(path);
    return true;
  }

  processObjects(): void {
    let collectionObject = this.digitalObjects[0];
    let digitalObjects = this.digitalObjects.slice(1);
    this.addCsvObjectRow(collectionObject);

    for ( let fileType of ['mm', 'pm'] ) {
      for ( let object of digitalObjects ) {
        if (object.hasFileType(fileType)) {
          this.addCsvObjectRow(object, fileType);
          this.processFiles(object.files, fileType);
        }
      }
    }
  }

  processFiles(files: File[], partsPrefix: string): void {
    for ( let file of files ) {
      if (file.extensions[partsPrefix.toUpperCase()] !== null) {
        this.addCsvFileRow(file, partsPrefix);
        this.moveFile(file, partsPrefix);
      }
    }
  }


  addCsvObjectRow(object: DigitalObject, partsPrefix?: string): void {
    let parts = object.path.split('/').slice(1).join('/');
    if (partsPrefix) {
      parts = 'objects/' + partsPrefix + '/' + parts;
    }
    else {
      parts = 'objects' + parts;
    }

    this.addCsvRow(parts, object.metadata);
  }

  addCsvFileRow(file: File, partsPrefix: string): void {
    this.addCsvRow(file.getFilePartsWithPrefix(partsPrefix), file.metadata);
  }

  addCsvRow(parts, metadata) {
    let row = [parts];
    for ( let term of this.map.getMapFieldsAsList() ) {
      row.push(metadata[term] || '');
    }
    this.csvData.push(row);
  }

  addCsvHeader(): void {
    let row = ['parts'].concat(this.map.getMapFieldsAsList());
    this.csvData.push(row);
  }

  addIdentiferToObjectPath(): void {
    let ark = String(this.identifier.split('/').slice(-1));
    if (ark !== '') {
      ark = '_' + ark;
    }
    for ( let object of this.digitalObjects ) {
      object.path = object.path.replace('$ark', ark);
      for ( let file of object.files ) {
        file.path = file.path.replace('$ark', ark);
      }
    }
  }

  moveFile(file: File, partsPrefix: string): void {
    let filename = file.getFilenameWithPrefix(partsPrefix);
    let dest = this.workingDir + '/' + file.getFilePartsWithPrefix(partsPrefix);
    let src = this.workingDir + '/../' + filename;

    this.createDir(this.basePath(dest));
    try {
      renameSync(src, dest);
    } catch(e) {
      this.logger.error('Unable to move file ' + filename);
      return;
    }
    this.logger.info('Moved file ' + filename + ' to ' + this.basePath(dest));
  }

  basePath(path: string): string {
    return path.match(/.*[/\\]/).toString();
  }

}
