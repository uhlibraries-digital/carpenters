import { Injectable } from '@angular/core';
import { renameSync } from 'fs';
import * as mkdirp from 'mkdirp';

import { LoggerService } from '../shared/logger.service';
import { CsvService } from '../shared/csv.service';

import { DigitalObject } from './digital-object';
import { File } from './file';

@Injectable()
export class DipService {

  csvData: any[];
  workingDir: string;
  digitalObjects: DigitalObject[];
  objectSequance: number;
  metadataLabels: string[];

  constructor(
    private logger: LoggerService,
    private csvService: CsvService) {
  }

  create(digitalObjects: DigitalObject[], workingDir: string): void {
    this.digitalObjects = digitalObjects;
    this.workingDir = workingDir + 'dip/';

    this.logger.info('Creating DIP...');
    this.logger.info('Creating directories');
    this.createDir(this.workingDir);

    this.csvData = [];
    this.objectSequance = 0;

    this.metadataLabels = this.getMetadataLabels();
    this.addCsvHeader();

    this.processObjects();
    this.logger.info('Creating DIP metadata.csv')
    this.csvService.write(this.workingDir + '/metadata.csv', this.csvData);
    this.logger.info('Done packaging DIP');
  }

  createDir(path: string): boolean {
    mkdirp.sync(path);
    return true;
  }

  processObjects(): void {
    let collectionObject = this.digitalObjects[0];
    let digitalObjects = this.digitalObjects.slice(1);

    this.csvData.push(['objects'].concat(this.getMetadataValues(collectionObject.metadata)));
    for ( let object of digitalObjects ) {
      this.csvData.push(['objects/' + this.padLeft(++this.objectSequance, 3, "0")]
        .concat(this.getMetadataValues(object.metadata)));
      this.processFiles(object.files);
    }
  }

  processFiles(files: File[]): void {
    for ( let file of files ) {
      if (file.hasFileExt('AC')) {
        this.csvData.push([this.getFilePath(file)]
          .concat(this.getMetadataValues(file.metadata)));
        this.moveFile(file);
      }
    }
  }

  addCsvHeader(): void {
    let row = ['file_path'].concat(this.getMetadataLabels());
    this.csvData.push(row);
  }

  getMetadataLabels(): string[] {
    return Object.keys(this.digitalObjects[0].metadata);
  }

  getMetadataValues(metadata: string[]): string [] {
    let row = [];
    for ( let term of this.metadataLabels ) {
      row.push(metadata[term] || '');
    }
    return row;
  }

  getFilePath(file: File): string {
    return 'objects/' + this.padLeft(this.objectSequance, 3, "0") + '/' + this.getFilename(file);
  }

  getFilename(file: File): string {
    return file.filename + file.extensions['AC'];
  }

  moveFile(file: File) {
    let filename = this.getFilename(file);
    let src = this.workingDir + '../' + filename;
    let dest = this.workingDir + this.getFilePath(file);

    this.createDir(this.basePath(dest));
    try {
      renameSync(src, dest);
    } catch(e) {
      this.logger.error('Unable to move file ' + filename);
      return;
    }
    this.logger.info('Moved file ' + filename + ' to ' + this.basePath(dest));
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private basePath(path: string): string {
    return path.match(/.*[/\\]/).toString();
  }

}
