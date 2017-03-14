import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { ipcRenderer } from 'electron';

import { StandardItemService } from '../shared/standard-item.service';
import { LocalStorageService } from '../shared/local-storage.service';
import { SessionStorageService } from '../shared/session-storage.service';
import { SaveService } from '../shared/save.service';
import { LoggerService } from '../shared/logger.service';

import { Item } from '../shared/item';

@Component({
  selector: 'standard',
  templateUrl: './standard/standard.component.html',
  styles: [ require('./standard.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class StandardComponent implements OnInit {
  mintSip: boolean;
  items: Item[];

  constructor(
    private standardItems: StandardItemService,
    private storage: LocalStorageService,
    private session: SessionStorageService,
    private saveService: SaveService,
    private log: LoggerService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'false');

    this.items = this.standardItems.getAll();
    this.standardItems.itemChanged.subscribe(items => this.items = items);

    ipcRenderer.removeAllListeners('save-project');
    ipcRenderer.removeAllListeners('save-as-project');
    ipcRenderer.removeAllListeners('open-project');

    ipcRenderer.on('save-project', (event, arg) => {
      this.saveService.save();
    });
    ipcRenderer.on('save-as-project', (event, arg) => {
      this.saveService.saveLocation = null;
      this.saveService.save();
    });
    ipcRenderer.on('open-project', (event, arg) => {
      this.saveService.open();
    });
  }

  toggleMintSip(mint: boolean): void {
    this.storage.set('mint_sip', ((mint) ? 'true' : 'false'));
  }

}
