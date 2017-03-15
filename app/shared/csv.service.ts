import { Injectable } from '@angular/core';
import { writeFile } from 'fs';
import * as stringify from 'csv-stringify';

import { ActivityService } from './activity.service';
import { LoggerService } from './logger.service';

@Injectable()
export class CsvService {

  constructor(
    private activity: ActivityService,
    private log: LoggerService) {
  }

  write(filename: string, data: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.activity.start();
      let csv = stringify({delimiter: ','});
      let output = '';
      csv.on('readable', () => {
        let row: any;
        while (row = csv.read()) {
          output += row;
        }
      });
      csv.on('finish', () => {
        writeFile(filename, output, (err) => {
          this.activity.stop();
          if (err) {
            reject(err);
          }
          resolve();
        });
      });
      csv.on('error', (err) => {
        this.log.error(err.message);
      });
      
      for (let row of data) {
        csv.write(row);
      }
      csv.end();
    })
  }

}
