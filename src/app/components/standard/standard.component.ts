import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { dirname } from 'path';

import { StandardItemService } from 'app/services/standard-item.service';
import { LocalStorageService } from 'app/services/local-storage.service';
import { SessionStorageService } from 'app/services/session-storage.service';
import { SaveService } from 'app/services/save.service';
import { LoggerService } from 'app/services/logger.service';
import { FilesService } from 'app/services/files.service';
import { ElectronService } from 'app/services/electron.service';

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
    private electronService: ElectronService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'false');

    this.items = this.standardItems.getAll();
    this.standardItems.itemChanged.subscribe(items => this.items = items);

    this.electronService.ipcRenderer.removeAllListeners('save-project');
    this.electronService.ipcRenderer.removeAllListeners('save-as-project');
    this.electronService.ipcRenderer.removeAllListeners('open-project');

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
      this.filesService.createFolderHierarchy(dirname(this.saveService.saveLocation));
      this.log.info("Project committed");
    });
  }

  toggleMintSip(mint: boolean): void {
    this.storage.set('mint_sip', ((mint) ? 'true' : 'false'));
  }

}
