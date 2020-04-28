import { Injectable } from '@angular/core';

import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { SaveService } from './save.service';
import { SipService } from './sip.service';
import { ModifiedMasterService } from './modified-master.service';
import { ShotListService } from './shot-list.service';
import { ElectronService } from './electron.service';


@Injectable()
export class ExportService {

  preferences: any;
  selectedResource: any;

  constructor(
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private saveService: SaveService,
    private shotlist: ShotListService,
    private sip: SipService,
    private mm: ModifiedMasterService,
    private electronService: ElectronService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
    this.standardItem.resourceChanged.subscribe(resource => this.selectedResource = resource);
  }

  exportPreservation(exportLocation?: string) {
    let location = '';

    if (exportLocation) {
      location = exportLocation;
    }
    else {
      location = this.saveDialog();
    }

    if (!location) {
      return;
    }
    this.sip.package(location, this.selectedResource);
  }

  exportModifedMasters(exportLocation?: string) {
    const location = exportLocation ? exportLocation : this.saveDialog();

    if (!location) {
      return;
    }
    this.mm.package(location, this.selectedResource);
  }

  exportShotList() {
    let location = this.saveDialog([{ name: 'CSV', extensions: ['csv'] }]);
    if (!location) {
      return;
    }
    this.shotlist.package(location);
  }

  continueExportSip(): boolean {
    const status = this.sip.loadExportStatus();
    return status !== null ? true : false;
  }

  exportStatusSipProjectLocation(): string {
    const status = this.sip.loadExportStatus();
    return status.projectLocation || null;
  }

  exportStatusExportLocation(): string {
    const status = this.sip.loadExportStatus();
    return status.exportLocation || null;
  }

  exportStatusClear(): void {
    this.sip.deleteExportStatus();
  }

  exportStatusObjectComplete(): number[] {
    return this.sip.completedExportStatus();
  }

  private saveDialog(fileFilters?: any): string {
    let path = '~/';
    if (this.saveService.saveLocation !== undefined) {
      path = this.saveService.saveLocationBasePath() + '/';
    }
    path += this.selectedResource ? this.selectedResource.id_0 || 'Untitled' : 'Untitled';
    let location = this.electronService.dialog.showSaveDialog({
      title: 'Export...',
      buttonLabel: 'Export',
      defaultPath: path,
      filters: fileFilters
    });

    return location;
  }

}
