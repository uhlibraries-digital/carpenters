import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { remote } from 'electron';

import { LocalStorageService } from '../shared/local-storage.service';
import { MapService } from '../shared/map.service';
import { IngestService } from './ingest.service';
import { SipService } from './sip.service';
import { DipService } from './dip.service';
import { LoggerService } from '../shared/logger.service';
import { RollbackService } from './rollback.service';
import { GreensService } from '../shared/greens.service';

import { Erc } from '../shared/erc';

@Component({
  selector: 'ingest',
  templateUrl: './ingest/ingest.component.html',
  styles: [ require('./ingest.component.scss') ],
  providers:[
    IngestService,
    SipService,
    DipService,
    RollbackService
  ]
})
export class IngestComponent implements OnInit {

  settings: any;
  arkIdentifier: string;
  erc: Erc;
  minterDisplay: any;
  editorDisplay: any;
  processingArk: boolean;

  @ViewChild('arkRequestDisplay') arkRequestDisplay;

  constructor(
    private modalService: NgbModal,
    private storage: LocalStorageService,
    private map: MapService,
    private ingest: IngestService,
    private logger: LoggerService,
    private rb: RollbackService,
    private minter: GreensService) {
  }

  ngOnInit(): void {
    this.settings = this.storage.get('settings');
    this.loadMap();
  }

  openSettings(content):void {
    this.modalService.open(content).result.then((result) => {
      this.storage.set('settings', this.settings);
      this.loadMap();
    },
    (reason) => { });
  }

  openArkRequest(): Promise<any> {
    return this.modalService.open(this.arkRequestDisplay).result;
  }

  openMinter(content): void {
    this.arkIdentifier = null;
    this.processingArk = false;
    this.erc = new Erc(
      this.settings.erc_who,
      '',
      null,
      this.settings.erc_where
    );
    this.erc.when = this.erc.toTodayISOString();

    this.minterDisplay = this.modalService.open(content, { backdrop: 'static', keyboard: false });
    this.minterDisplay.result.then((result) => {

    },
    (reason) => { });
  }

  openEditor(content): void {
    this.erc = null;
    this.processingArk = false;
    this.arkIdentifier = null;

    this.editorDisplay = this.modalService.open(content, { keyboard: false});
    this.editorDisplay.result.then((result) => {
      this.minter.update(this.arkIdentifier, this.erc).then((result) => {
        this.logger.info('Updated changes to ARK: ' + this.arkIdentifier);
      },
      (error) => {
        this.logger.error('Unable to update ARK: ' + this.arkIdentifier + ', ' + error);
      });
    },
    (reason) => { });
  }

  getArkForEdit(): void {
    this.processingArk = true;

    /* Settings can change between processing so setup minter here */
    this.minter.setMintUrl(this.settings.mint_url);
    this.minter.setUpdateUrl(this.settings.update_url);
    this.minter.setApiKey(this.settings.api_key);

    this.minter.get(this.arkIdentifier).then((ark) => {
      this.processingArk = false;
      this.erc = new Erc(
        ark.who,
        ark.what,
        ark.when,
        ark.where
      );
    },
    (error) => {
      this.erc = null;
      this.processingArk = false;
      this.logger.error('Unable to get ARK: ' + error);
      this.editorDisplay.close();
    });
  }

  generateArk() {
    this.processingArk = true;
    /* Settings can change between processing so setup minter here */
    this.minter.setMintUrl(this.settings.mint_url);
    this.minter.setUpdateUrl(this.settings.update_url);
    this.minter.setApiKey(this.settings.api_key);

    this.minter.mint().then((id) => {
      this.processingArk = false;
      this.arkIdentifier = id;
      if (this.erc.where.indexOf('$ark$') > -1) {
        this.erc.where = this.erc.where.replace('$ark$', encodeURIComponent(this.arkIdentifier));
        this.minter.update(this.arkIdentifier, this.erc);
      }
      this.logger.success('ARK created: ' + this.arkIdentifier);
      this.logger.info('Erc:');
      this.logger.info('Who: ' + this.erc.who);
      this.logger.info('What: ' + this.erc.what);
      this.logger.info('When: ' + this.erc.when);
      this.logger.info('Where: ' + this.erc.where);
    },
    (error) => {
      this.processingArk = false;
      this.minterDisplay.close();
      this.logger.error('Unable to create ark: ' + error);
    });
  }

  copyToClipboard(identifier: string) {
    let { clipboard } = remote;
    clipboard.write({text: identifier})
  }

  loadMap(): void {
    if ( this.settings.map_url ) {
      this.map.getMapFields(this.settings.map_url).then(() => {
        this.storage.set('mapFields', this.map.getMapFieldsAsList());
        this.logger.info('Archival MAP loaded');
      },
      (reason) => {
        this.logger.error('Failed to load Archival MAP, using cached version: ' + reason);
      });
    }
  }

  toggleAutoMint(): void {
    this.settings.mint_arks = !this.settings.mint_arks;
    this.storage.set('settings', this.settings);
  }

  handleDrop(e): void {
    e.stopPropagation();
    e.preventDefault();

    let files:File[] = e.dataTransfer.files;
    for (let file of files) {
      this.processIngest(file.path);
    }
  }

  openFile(): void {
    let { dialog } = remote;
    let filenames = dialog.showOpenDialog({
      filters: [
        { name: 'Excel File', extensions: ['xlsx'] }
      ],
      title: "Open Preservation File"
    });
    if (filenames === undefined) {
      return;
    }
    for ( let file of filenames ) {
      this.processIngest(file);
    }
  }

  processIngest(path: string): void {
    this.ingest.loadSpreadsheetFromFile(path);

    if (!this.settings.mint_arks) {
      this.arkIdentifier = '';
      this.openArkRequest().then((result) => {
        this.ingest.process(this.arkIdentifier);
      },
      (reason) => {
        this.logger.info('File processing canceled');
      });
    }
    else {
      this.ingest.process();
    }
  }

  rollback(): void {
    this.rb.rollback(this.ingest.workingDir);
  }

}
