import { Injectable } from '@angular/core';
import { remote } from 'electron';

import { ArchivesSpaceService } from './archivesspace.service';
import { LocalStorageService } from './local-storage.service';
import { MapService } from './map.service';
import { SaveService } from './save.service';
import { GreensService } from './greens.service';
import { PreservationService } from './preservation.service';

let { dialog } = remote;

@Injectable()
export class ExportService {

  preferences: any;
  selectedResource: any;

  constructor(
    private asService: ArchivesSpaceService,
    private storage: LocalStorageService,
    private archivalMap: MapService,
    private fullMap: MapService,
    private saveService: SaveService,
    private minter: GreensService,
    private sip: PreservationService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
    this.storage.changed.subscribe(key => {
      if (key === 'preferences') {
        this.preferences = this.storage.get(key);
        this.loadSettings();
      }
    });
    this.loadSettings();
  }

  exportPreservation() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }
    this.packagePreservation(location);
  }

  exportAccess() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }
    this.packageAccess(location);
  }

  exportBoth() {
    let location = this.saveDialog();
    if (!location) {
      return;
    }
    this.packagePreservation(location);
    this.packageAccess(location);
  }

  private packagePreservation(location: string): void {
    this.sip.package(location);
  }

  private packageAccess(location: string): void {

  }

  private saveDialog(): string {
    let path = '~/';
    if (this.saveService.saveLocation !== undefined) {
      path = this.saveService.saveLocation + '/';
    }
    path += this.selectedResource.id_0;
    return dialog.showSaveDialog({
      title: 'Export...',
      buttonLabel: 'Export',
      defaultPath: path
    });
  }

  private loadSettings(): void {
    if (!this.preferences) {
      return;
    }
    if (this.preferences.minter.endpoint !== '') {
      this.minter.setEndpoint(this.preferences.minter.endpoint, this.preferences.minter.prefix);
      this.minter.setApiKey(this.preferences.minter.key);
    }
    if (this.preferences.map.archival !== '') {
      this.archivalMap.getMapFields(this.preferences.map.archival);
    }
    if (this.preferences.map.full !== '') {
      this.fullMap.getMapFields(this.preferences.map.full);
    }
  }

}
