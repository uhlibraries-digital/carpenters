import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subscription } from "rxjs/Subscription";

import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { ObjectService } from 'app/services/object.service';
import { StandardItemService } from 'app/services/standard-item.service';
import { SaveService } from 'app/services/save.service';
import { ElectronService } from 'app/services/electron.service';
import { ProductionNotesService } from 'app/services/production-notes.service';

@Component({
  selector: 'object-list',
  templateUrl: './object-list.component.html',
  styleUrls: [ './object-list.component.scss' ],
})
export class ObjectListComponent implements OnInit, OnDestroy {

  objects: any;
  private selectedObject: any;
  private subscriptions: Subscription;

  constructor(
    private archivesSpaceService: ArchivesSpaceService,
    private standardItemService: StandardItemService,
    private objectService: ObjectService,
    private electronService: ElectronService,
    private note: ProductionNotesService,
    private changeRef: ChangeDetectorRef,
    private saveService: SaveService
  ) { }

  ngOnInit() {
    this.subscriptions = new Subscription();

    this.objects = this.archivesSpaceService.selectedArchivalObjects();
    if (this.objects.length === 0) {
      this.objects = this.standardItemService.getAll();
      const itemSub = this.standardItemService.itemChanged
        .subscribe((objects) => {
          this.objects = objects;
        });
      this.subscriptions.add(itemSub);
    }
    else {
      const aspaceSub = this.archivesSpaceService.selectedArchivalObjectsChanged
        .subscribe((objects) => {
          this.objects = objects;
        });
      this.subscriptions.add(aspaceSub);
    }

    const saveSub = this.saveService.projectChanged.subscribe((location) => {
      this.selectedObject = null;
      this.objectService.setObject(null);
    });
    this.subscriptions.add(saveSub);
  
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onClick(obj: any) {
    this.selectedObject = obj;
    this.objectService.setObject(obj);
  }

  onContextMenu(index: number, c: any, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    let contextMenu = new this.electronService.Menu();
    contextMenu.append(new this.electronService.MenuItem({
      label: (c.productionNotes ? 'Edit' : 'Add') + ' Note',
      click: () => {
        this.note.display(c);
      }
    }));
    if (c.productionNotes) {
      contextMenu.append(new this.electronService.MenuItem({
        label: 'Clear Note',
        click: () => {
          c.productionNotes = '';
          this.changeRef.detectChanges();
        }
      }));
    }

    contextMenu.popup(this.electronService.remote.getCurrentWindow());
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