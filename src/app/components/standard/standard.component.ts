import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { dirname } from 'path';

import { StandardItemService } from 'app/services/standard-item.service';
import { LocalStorageService } from 'app/services/local-storage.service';
import { SessionStorageService } from 'app/services/session-storage.service';
import { SaveService } from 'app/services/save.service';
import { LoggerService } from 'app/services/logger.service';
import { FilesService } from 'app/services/files.service';
import { ElectronService } from 'app/services/electron.service';
import { ExportService } from 'app/services/export.service';

import { Item } from '../../classes/item';

@Component({
  selector: 'standard',
  templateUrl: './standard.component.html',
  styleUrls: [ './standard.component.scss' ],
})
export class StandardComponent implements OnInit {
  mintSip: boolean;
  items: Item[];

  constructor(
    private standardItems: StandardItemService,
    private storage: LocalStorageService,
    private session: SessionStorageService,
    private saveService: SaveService,
    private log: LoggerService,
    private filesService: FilesService,
    private electronService: ElectronService,
    private exportService: ExportService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'false');

    this.items = this.standardItems.getAll();
    this.standardItems.itemChanged.subscribe(items => this.items = items);

    this.electronService.ipcRenderer.removeAllListeners('save-project');
    this.electronService.ipcRenderer.removeAllListeners('save-as-project');
    this.electronService.ipcRenderer.removeAllListeners('open-project');
    this.electronService.ipcRenderer.removeAllListeners('commit-project');

    this.electronService.ipcRenderer.on('save-project', (event, arg) => {
      this.saveService.save();
    });
    this.electronService.ipcRenderer.on('save-as-project', (event, arg) => {
      this.saveService.saveLocation = null;
      this.saveService.save();
    });
    this.electronService.ipcRenderer.on('open-project', (event, arg) => {
      this.saveService.open();
    });
    this.electronService.ipcRenderer.on('commit-project', (event, arg) => {
      if (!this.saveService.saveLocation) {
        this.log.warn("Please save this project before committing it.");
        return;
      }
      this.saveService.save();
      this.log.info("Project committed");
    });

    /* Continue export dialog should be asked on app startup, which starts with
    the ArchivesspaceComponent first. By this point the export question
    was already asked and we need to continue a standard project */
    const exportAnswer = sessionStorage.getItem('exportAnswer');
    if (this.exportService.continueExportSip() && exportAnswer === 'yes') {
      sessionStorage.removeItem('exportAnswer');
      console.log('Continuing export');
      const exportLocation = this.exportService.exportStatusExportLocation();
      this.exportService.exportPreservation(exportLocation);
    }
  }

  toggleMintSip(mint: boolean): void {
    this.storage.set('mint_sip', ((mint) ? 'true' : 'false'));
  }

}
