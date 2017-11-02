import { Component, OnInit } from '@angular/core';

import { FilesService } from 'app/services/files.service';
import { LoggerService } from 'app/services/logger.service';

import { File } from 'app/classes/file';

@Component({
  selector: 'file-browser',
  templateUrl: './file-browser.component.html',
  styleUrls: [ './file-browser.component.scss' ]
})
export class FileBrowserComponent implements OnInit {

  files: File[];
  willAssignFiles: boolean;
  assignNumberOfFiles: number;

  constructor(
    private filesService: FilesService,
    private log: LoggerService) {
  }

  ngOnInit(): void {
    this.filesService.filesChanged.subscribe((files) => { this.files = files });
    this.files = this.filesService.availableFiles;
    this.willAssignFiles = true;
    this.assignNumberOfFiles = 2;
  }

  loadFiles(): void {
    this.filesService.loadFiles();
  }

  assignFiles(): void {
    if (!this.files || this.files.length === 0) {
      this.log.error('Please load files before assigning them.');
      return;
    }
    if (this.willAssignFiles) {
      this.filesService.processFiles(this.assignNumberOfFiles);
    }
    else {
      this.filesService.processFiles();
    }
  }

}