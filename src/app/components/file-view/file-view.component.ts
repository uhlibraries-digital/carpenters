import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

import { ObjectService } from 'app/services/object.service';
import { FilesService } from 'app/services/files.service';
import { SaveService } from 'app/services/save.service';

@Component({
  selector: 'file-view',
  templateUrl: './file-view.component.html',
  styleUrls: [ './file-view.component.scss' ],
})
export class FileViewComponent implements OnInit {

  objectViewWidth: string;
  updating: boolean;

  @ViewChild('fileUpdateBtn') fileUpdateBtn: ElementRef;

  constructor(
    private objectService: ObjectService,
    private filesService: FilesService,
    private saveService: SaveService
  ) { }

  ngOnInit() {
    this.objectService.objectViewWidthChanged.subscribe(width => this.objectViewWidth = width);
    this.objectViewWidth = this.objectViewWidth;
    this.updating = false;
  }

  updateFiles() {
    this.updating = true;
    this.fileUpdateBtn.nativeElement.disabled = true;
    this.filesService.updateFileAssignments()
      .then(() => {
        this.updating = false;
        this.fileUpdateBtn.nativeElement.disabled = false;
        if (this.saveService.saveLocation) {
          this.saveService.save(false);
        }
      })
  }

}
