import { Injectable } from '@angular/core';
import { writeFile } from 'fs';
import * as stringify from 'csv-stringify';

import { LoggerService } from './logger.service';

@Injectable()
export class CsvService {

  constructor(
    private log: LoggerService) {
  }

  write(filename: string, data: any[]): void {
    stringify(data, (err, output) => {
      if (err) throw err;
      writeFile(filename, output), (err) => {
        if (err) {
          this.log.error('Error saving CSV ' + filename + ': ' + err.message);
        }
      }
    });
  }

}
