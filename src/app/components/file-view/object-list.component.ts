import { Component, OnInit } from '@angular/core';

import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { ObjectService } from 'app/services/object.service';
import { StandardItemService } from 'app/services/standard-item.service';

@Component({
  selector: 'object-list',
  templateUrl: './object-list.component.html',
  styleUrls: [ './object-list.component.scss' ],
})
export class ObjectListComponent implements OnInit {

  private objects: any;
  private selectedObject: any;

  constructor(
    private archivesSpaceService: ArchivesSpaceService,
    private standardItemService: StandardItemService,
    private objectService: ObjectService
  ) { }

  ngOnInit() {
    this.objects = this.archivesSpaceService.selectedArchivalObjects();
    if (this.objects.length === 0) {
      this.objects = this.standardItemService.getAll();
    }
  }

  onClick(obj: any) {
    this.selectedObject = obj;
    this.objectService.setObject(obj);
  }

  displayTitle(obj: any) {
    if (obj.artificial) {
      return obj.parent.title;
    }
    return obj.title;
  }

  displayContainer(obj: any): string {
    return obj.containersLoading ? 'Loading container information'
      : this.archivesSpaceService.displayContainer(obj);
  }
}