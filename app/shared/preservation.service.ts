import { Injectable } from '@angular/core';
import { renameSync } from 'fs';
import * as mkdirp from 'mkdirp';

import { ArchivesSpaceService } from './archivesspace.service';
import { LocalStorageService } from './local-storage.service';
import { MapService } from './map.service';
import { LoggerService } from './logger.service';

import { MapField } from './map-field';
import { File } from './file';

@Injectable()
export class PreservationService {

  private selectedObjects: any;
  private mapFields: MapField[];
  private location: string;
  private hierarchySquances: any;

  constructor(
    private asService: ArchivesSpaceService,
    private storage: LocalStorageService,
    private map: MapService,
    private log: LoggerService) {

    this.storage.changed.subscribe((key) => {
      if (key === 'preferences') {
        this.loadMap();
      }
    });
    this.loadMap();
  }

  package(location: string): void {
    this.location = location;
    this.selectedObjects = this.asService.selectedArchivalObjects();

    this.addFilePaths(this.selectedObjects);
    this.createDirectories();
    let partsPaths = this.processFiles(this.selectedObjects);
    this.createCsv(partsPaths);
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

  private createDirectories() {
    mkdirp.sync(this.location + '/logs');
    mkdirp.sync(this.location + '/metadata/submissionDocumentation');
    mkdirp.sync(this.location + '/objects');
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
    let levelCheck = ['series', 'subseries', 'other'];
    if (o.files || levelCheck.indexOf(o.level) > -1) {
      flatstruct.push(node);
    }
    return node;
  }

  private getPathFromFlatStructure(struct: any[]): string {
    let path: string = '';
    for (let s of struct) {
      if (s.object.level === 'series') {
        path += 's' + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else if (s.object.level === 'subseries') {
        path += 'ss' + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else if (s.object.level === 'other') {
        let checkObject = s.object;
        let sssPrefix = 'ss';
        while (checkObject && checkObject.level === 'other') {
          sssPrefix += 's';
          checkObject = checkObject.parent;
        }
        path += sssPrefix + this.asService.padLeft(s.object.series_index, 3, '0') + '/';
      }
      else {
        if (!(path in this.hierarchySquances)) {
          this.hierarchySquances[path] = 0;
        }
        this.hierarchySquances[path] += 1;
        path += this.asService.padLeft(this.hierarchySquances[path], 3, '0') + '/';
      }
    }
    return path;
  }

  private createCsv(partsPaths: string[]) {
    console.log(partsPaths);
    console.log(this.mapFields);
  }

  loadMap(): void {
    let archivalMap = this.storage.get('preferences').map.archival;
    if (archivalMap) {
      this.map.getMapFields(archivalMap)
        .then(fields => this.mapFields = fields)
        .catch((error) => {
          this.log.error('Unable to get Archival Map');
        });
    }
  }


}
