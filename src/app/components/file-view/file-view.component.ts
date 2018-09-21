import { Component, OnInit } from '@angular/core';

import { ObjectService } from 'app/services/object.service';

@Component({
  selector: 'file-view',
  templateUrl: './file-view.component.html',
  styleUrls: [ './file-view.component.scss' ],
})
export class FileViewComponent implements OnInit {

  private objectViewWidth: string;

  constructor(private objectService: ObjectService) { }

  ngOnInit() {
    this.objectService.objectViewWidthChanged.subscribe(width => this.objectViewWidth = width);
    this.objectViewWidth = this.objectViewWidth;
  }

}
