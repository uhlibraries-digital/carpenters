import { Injectable } from '@angular/core';
import { readFile, utils } from 'xlsx';
import { writeFile } from 'fs';

import { LocalStorageService } from '../shared/local-storage.service';
import { GreensService } from '../shared/greens.service';
import { LoggerService } from '../shared/logger.service';
import { MapService } from '../shared/map.service';
import { SipService } from './sip.service';
import { DipService } from './dip.service';

import { Erc } from '../shared/erc';
import { DigitalObject } from './digital-object';
import { File } from './file';

@Injectable()
export class IngestService {

  settings: any;
  workbook: any;
  workingDir: string;
  filename: string;
  erc: Erc;

  private path: string[];
  private hierarchySquances: number[];
  private digitalObjects: DigitalObject[];

  constructor(
    private storage: LocalStorageService,
    private minter: GreensService,
    private logger: LoggerService,
    private map: MapService,
    private sip: SipService,
    private dip: DipService) {
  }

  loadSpreadsheetFromFile(filename: string): void {
    this.workbook = readFile(filename);
    this.filename = filename;
    this.workingDir = this.basePath(filename);
  }

  basePath(path: string): string {
    return path.match(/.*[/\\]/).toString();
  }

  process(identifier: string = ''): void {
    if (!this.workbook) {
      this.logger.error('No spreadsheet loaded');
      return;
    }

    this.logger.clear();

    this.settings = this.storage.get('settings');

    /* Settings can change between processing so setup minter here */
    this.minter.setMintUrl(this.settings.mint_url);
    this.minter.setUpdateUrl(this.settings.update_url);
    this.minter.setApiKey(this.settings.api_key);

    this.path = [];
    this.hierarchySquances = [];

    this.logger.info('Processing ' + this.filename);
    let worksheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
    this.digitalObjects = this.worksheetToDigitalObjects(worksheet);
    if (!this.digitalObjects) {
      this.logger.error('Unable to continue');
      return;
    }

    if (this.settings.mint_arks) {
      this.logger.info('Minting ARK...');
      this.mintArk().then((id) => {
        this.logger.success('Minted using identifier: ' + id);
        if (this.erc.where.indexOf('$ark$') > -1) {
          this.logger.info('Updating ERC Where');
          this.erc.where = this.erc.where.replace('$ark$', encodeURIComponent(id));
          this.minter.update(id, this.erc);
        }
        this.digitalObjects[0].metadata['dcterms.identifier'] = id;
        this.createOutputs();
      },
      (error) => {
        this.logger.error('Unable to mint ARK. ' + error);
        return;
      });
    }
    else {
      this.digitalObjects[0].metadata['dcterms.identifier'] = identifier;
      this.logger.info('Using identifier: ' + identifier);
      this.createOutputs();
    }
  }

  createOutputs() {
    this.sip.create(this.digitalObjects, this.workingDir);
    this.dip.create(this.digitalObjects, this.workingDir);
    this.logger.success('Done');

    let filename = this.sip.workingDir +
      '/metadata/submissionDocumentation/carpenters-' +
      this.toTodayISOString() + '.log';
    writeFile(filename, this.logger.toString());
  }

  worksheetToDigitalObjects(worksheet: any): DigitalObject[] {
    let digitalObjects: DigitalObject[] = [];
    let range = utils.decode_range(worksheet['!ref']);
    let header = this.getRowFromWorksheet(0, worksheet);
    let metadataLabels = this.metadataPart(header);

    if (!this.varifyWithArchivalMap(metadataLabels)) {
      return null;
    }

    for ( let r = 1; r <= range.e.r; r++ ) {
      let row = this.getRowFromWorksheet(r, worksheet);
      if (!row) {
        continue;
      }

      let path = this.getHierarchyPath(row);
      /* Assume the first row is collection */
      if (this.isDigitalObject(row) || r === 1) {
        let digitalObject = new DigitalObject();
        digitalObject.path = path;
        digitalObject.metadata = this.getMetadata(row, metadataLabels);
        digitalObject.files = [];
        digitalObjects.push(digitalObject);
      }
      else if (this.isFile(row)) {
        let file = new File();
        let parts = this.filePart(row);
        file.path = path;
        file.metadata = this.getMetadata(row, metadataLabels);
        file.filename = parts[0];
        file.extensions = {
          'PM': parts[1],
          'MM': parts[2],
          'AC': parts[3]
        };
        let digitalObject = digitalObjects.pop();
        digitalObject.files.push(file);
        digitalObjects.push(digitalObject);
      }
    }

    return digitalObjects;
  }

  getMetadata(row: any, terms: string[]): any {
    let values = this.metadataPart(row);
    let metadata = {};
    for ( let i = 0; i < values.length; i++ ) {
      metadata[terms[i]] = values[i];
    }
    return metadata;
  }

  getHierarchyPath(row: any): string {
    let hierarchy: string[] = this.hierarchyPart(row);
    let fileInformation: string[] = this.filePart(row);

    for ( let index = 0; index < hierarchy.length; index++ ) {
      let level = hierarchy[index];
      if (level && !fileInformation[0]) {
        if (index < this.path.length) {
          this.resetHierarchySequances(index + 1, this.path.length);
          this.path = this.path.slice(0, index);
        }
        if (level === 'x') {
          if (!this.hierarchySquances[index]) {
            this.hierarchySquances[index] = 0;
          }

          level = this.padLeft(String(++this.hierarchySquances[index]), 3, "0") +
                  '$ark';
        }
        this.path.push(level);
      }
    }

    return this.path.join('/');
  }

  resetHierarchySequances(start: number, end: number): void {
    for ( let i = start; i <= end; i++ ) {
      this.hierarchySquances[i] = 0;
    }
  }

  getRowFromWorksheet(rowNumber: number, worksheet: any): any {
    let range = utils.decode_range(worksheet['!ref']);
    let row = [];
    for ( let c = range.s.c; c <= range.e.c; c++ ) {
      let cell = utils.encode_cell({r: rowNumber, c: c});
      try {
        row[c] = worksheet[cell].v || '';
      } catch(e) {
        row[c] = null;
      }
    }
    let checkRow = row.filter(row => row !== null);
    return checkRow.length > 0 ? row : null;
  }

  varifyWithArchivalMap(terms: string[]): boolean {
    let good: boolean = true;

    for ( let field of this.map.getMapFieldsAsList() ) {
      if ( terms.indexOf(field) < 0 && field !== 'dcterms.identifier' ) {
        this.logger.error('ERROR: ' + field + ' is in the Archival MAP but not in the preservation file');
        good = false;
      }
    }

    for ( let term of terms ) {
      if (!this.map.getMapFieldByFullName(term)) {
        this.logger.warn('WARNING: ' + term + ' was found in the preservation file but not in the Archival MAP.');
      }
    }

    return good;
  }

  isDigitalObject(row: any): boolean {
    let file = this.filePart(row);
    let h = this.hierarchyPart(row);
    return (h.indexOf('x') > -1 && file[0] === null);
  }

  isFile(row: any): boolean {
    let h = this.hierarchyPart(row);
    return (!this.isDigitalObject(row) && h.indexOf('x') > -1);
  }

  hierarchyPart(row: any): string[] {
    return row.slice(0, 6);
  }

  filePart(row: any): string[] {
    return row.slice(6, 10);
  }

  metadataPart(row: any): string[] {
    return row.slice(10);
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

  private toTodayISOString(): string {
    let date = new Date();
    return date.getFullYear() +
      '-' + this.padLeft(date.getMonth() + 1, 2, "0") +
      '-' + this.padLeft(date.getDate(), 2, "0");
  }

  private mintArk(): Promise<any> {
    this.erc = new Erc(
      this.settings.erc_who,
      this.digitalObjects[0].metadata['dcterms.title'],
      this.toTodayISOString(),
      this.settings.erc_where);

    return this.minter.mint(this.erc);
  }


}
