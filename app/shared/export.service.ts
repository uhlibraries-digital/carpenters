import { Injectable } from '@angular/core';
import { remote } from 'electron';

import { ActivityService } from './activity.service';
import { ArchivesSpaceService } from './archivesspace.service';
import { StandardItemService } from './standard-item.service';
import { LocalStorageService } from './local-storage.service';
import { SaveService } from './save.service';
import { GreensService } from './greens.service';
import { PreservationService } from './preservation.service';
import { AccessService } from './access.service';
import { LoggerService } from './logger.service';

import { Erc } from './erc';

let { dialog } = remote;

@Injectable()
export class ExportService {

  preferences: any;
  selectedResource: any;

  constructor(
    private active: ActivityService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService,
    private storage: LocalStorageService,
    private saveService: SaveService,
    private minter: GreensService,
    private log: LoggerService,
    private sip: PreservationService,
    private dip: AccessService) {
    this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
    this.standardItem.resourceChanged.subscribe(resource => this.selectedResource = resource);
    this.storage.changed.subscribe(key => {
      if (key === 'preferences') {
        this.loadSettings();
      }
    });
    this.preferences = this.storage.get('preferences');
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
    this.packageAccess(location + '_DIP');
  }

  private packagePreservation(location: string): void {
    let mint = this.storage.get('mint_sip');
    if (mint && !this.hasArk()) {
      this.packagePreservationWithMint(location);
    }
    else {
      if (this.hasArk()) {
        this.log.warn('Using previously minted SIP Ark: ' + this.selectedResource.sip_ark);
      }
      this.sip.package(location, this.selectedResource);
      if (this.saveService.saveLocation) {
        this.saveService.save();
      }
    }
  }

  private packagePreservationWithMint(location: string): void {
    this.log.info('Minting Preservation SIP Ark...', false);
    let erc = new Erc(
      this.preferences.minter.ercWho,
      this.selectedResource.title || '',
      '',
      this.preferences.minter.ercWhere
    );
    erc.when = erc.toTodayISOString();
    this.active.start();
    this.minter.mint(erc)
      .then(id => {
        this.active.stop();
        if (erc.where.indexOf('$ark$') > -1) {
          erc.where = erc.where.replace('$ark$', id);
          this.minter.update(id, erc);
        }
        this.log.success('Minted SIP Ark: ' + id);
        this.selectedResource.sip_ark = id;
        this.sip.package(location, this.selectedResource);
        if (this.saveService.saveLocation) {
          this.saveService.save();
        }
      })
      .catch(error => {
        this.active.stop();
        this.log.error('An error occured while minting a new ark: ' + error);
        this.log.error('Failed to export preservation SIP');
      });
  }

  private packageAccess(location: string): void {
    this.dip.package(location, this.selectedResource);
    if (this.saveService.saveLocation) {
      this.saveService.save();
    }
  }

  private hasArk(): boolean {
    return this.selectedResource !== undefined &&
      this.selectedResource.sip_ark !== '' &&
      this.selectedResource.sip_ark !== undefined;
  }

  private saveDialog(): string {
    let path = '~/';
    if (this.saveService.saveLocation !== undefined) {
      path = this.saveService.saveLocationBasePath() + '/';
    }
    path += this.selectedResource.id_0 || 'Untitled';
    return dialog.showSaveDialog({
      title: 'Export...',
      buttonLabel: 'Export',
      defaultPath: path
    });
  }

  private loadSettings(): void {
    try {
      if (this.preferences.minter.endpoint !== '') {
        this.minter.setEndpoint(this.preferences.minter.endpoint, this.preferences.minter.prefix);
        this.minter.setApiKey(this.preferences.minter.key);
      }
    }
    catch(e) { return; }
  }

}
