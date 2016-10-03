import { Injectable } from '@angular/core';
import { readdirSync, statSync, renameSync } from 'fs';
import * as rimraf from 'rimraf';

import { LoggerService } from '../shared/logger.service';
import { SipService } from './sip.service';
import { DipService } from './dip.service';

@Injectable()
export class RollbackService {

  workingDir: string;

  constructor(
    private logger: LoggerService,
    private sip: SipService,
    private dip: DipService) {
  }

  rollback(path: string) {
    if (!path) {
      this.logger.warn('Unable to rollback. Please process a file first.');
      return;
    }

    this.logger.warn('Rolling back files...');
    this.workingDir = path;
    this.readDir(this.sip.workingDir + '/objects/');
    this.readDir(this.dip.workingDir + '/objects/');

    this.logger.warn('Removing ' + this.sip.workingDir);
    this.rmDir(this.sip.workingDir);
    this.logger.warn('Removing ' + this.dip.workingDir);
    this.rmDir(this.dip.workingDir);

    this.logger.success('Done rolling back');
  }

  readDir(path: string) {
    try {
      statSync(path);
    } catch(e) {
      console.error(path + ' does not exist');
      return;
    }

    let files = readdirSync(path);
    for ( let file of files ) {
      if ( statSync(path + file).isDirectory()) {
        this.readDir(path + file + '/');
      }
      else if (statSync(path + file).isFile()) {
        this.moveFile(file, path);
      }
    }
  }

  rmDir(path: string) {
    rimraf(path, (err) => {
      if (err) {
        console.log('Error removing ' + path + ': ' + err.message);
      }
    });
  }

  moveFile(filename: string, path: string): void {
    this.logger.warn('Moving back ' + filename);
    renameSync(path + filename, this.workingDir + filename);
  }

}
