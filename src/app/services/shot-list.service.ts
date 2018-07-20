import { Injectable } from '@angular/core';

import { ArchivesSpaceService } from './archivesspace.service';
import { CsvService } from './csv.service';
import { FilesService } from './files.service';
import { StandardItemService } from './standard-item.service';
import { LoggerService } from './logger.service';

@Injectable()
export class ShotListService {

  private selectedObjects: any;

  constructor(
    private asService: ArchivesSpaceService,
    private csv: CsvService,
    private standardItem: StandardItemService,
    private filesService: FilesService,
    private log: LoggerService ) {
      
  }

  package(location: string): Promise<any> {
    this.selectedObjects = this.asService.selectedArchivalObjects();
    if (this.selectedObjects.length === 0) {
      this.selectedObjects = this.standardItem.getAll();
    }

    if (!this.selectedObjects || this.selectedObjects.length === 0) {
      this.log.error('No Archival Objects/Standard Objects selected to export Shot List');
      return;
    }

    let csvData = this.shotListCsvData();
    return this.csv.write(location, csvData)
      .catch((err) => {
        this.log.error(err.message);
      });
  }

  private shotListCsvData(): any[] {
    let csvData = [['Title', 'Location']];

    for (let o of this.selectedObjects) {
      let container = this.filesService.convertFromASContainer(o.containers[0]);
      let path = this.filesService.containerToPath(container);
      csvData.push([o.title, path]);
    }

    return csvData;
  }
}