import { Injectable } from '@angular/core';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { SaveService } from './save.service';
import { SipService } from './sip.service';
import { DipService } from './dip.service';
import { LoggerService } from './logger.service';
import { ElectronService } from './electron.service';

import { Erc } from '../classes/erc';

@Injectable()
export class ExportService {

  preferences: any;
  selectedResource: any;

  constructor(
    private active: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private saveService: SaveService,
    private log: LoggerService,
    private sip: SipService,
    private dip: DipService,
    private electronService: ElectronService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
    this.standardItem.resourceChanged.subscribe(resource => this.selectedResource = resource);
  }

  exportPreservation() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }
    this.sip.package(location, this.selectedResource);
  }

  exportAccess() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }
    this.dip.package(location, this.selectedResource);
  }

  exportBoth() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }

    this.sip.package(location, this.selectedResource)
      .then(() => {
        this.dip.package(location + '_DIP', this.selectedResource);
      });
  }

  private saveDialog(): string {
    let path = '~/';
    if (this.saveService.saveLocation !== undefined) {
      path = this.saveService.saveLocationBasePath() + '/';
    }
    path += this.selectedResource ? this.selectedResource.id_0 || 'Untitled' : 'Untitled';
    let location = this.electronService.dialog.showSaveDialog({
      title: 'Export...',
      buttonLabel: 'Export',
      defaultPath: path
    });

    return location;
  }

}
