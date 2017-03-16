import { Component, ViewEncapsulation, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ipcRenderer, remote } from 'electron';

let { webContents } = remote;

import { LocalStorageService } from './shared/local-storage.service';
import { ExportService } from './shared/export.service';
import { ProductionNotesService } from './shared/production-notes.service';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styles: [ require('./app.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

  @ViewChild('preferencesDisplay') preferencesDisplay: any;
  @ViewChild('notesDisplay') notesDisplay: any;

  private preferences: any;
  private preferenceIndex: number = 0;

  private productionNotes: string = '';
  private productionNotesChild: any;

  constructor(
    private storage: LocalStorageService,
    private exportService: ExportService,
    private modalService: NgbModal,
    private notes: ProductionNotesService) {
  }

  ngOnInit(): void {
    this.preferences = this.storage.get('preferences');
    if ((typeof this.preferences) !== 'object') {
      this.setupPreferences();
    }
    ipcRenderer.on('show-preferences', (event, arg) => {
      this.showPreferences();
    });
    ipcRenderer.on('export-preservation', (event, arg) => {
      this.exportService.exportPreservation();
    });
    ipcRenderer.on('export-access', (event, arg) => {
      this.exportService.exportAccess();
    });
    ipcRenderer.on('export-both', (event, arg) => {
      this.exportService.exportBoth();
    });
    ipcRenderer.on('show-notes', (event, arg) => {
      this.showNotes();
    });

    this.notes.displayNote.subscribe((child) => {
      this.productionNotesChild = child;
      webContents.getFocusedWebContents().send('show-notes');
    });
  }

  showPreferences(): void {
    this.preferenceIndex = 0;
    this.modalService.open(this.preferencesDisplay, {
      backdrop: 'static',
      keyboard: false,
      size: 'lg'
    }).result.then((result) => {
      this.storage.set('preferences', this.preferences);
    },
    (rejected) => {
      this.preferences = this.storage.get('preferences');
    });
  }

  setupPreferences(): void {
    this.preferences = {
      'archivesspace': {
        'endpoint': '',
        'username': '',
        'password': ''
      },
      'map': {
        'archival': '',
        'full': ''
      },
      'minter': {
        'endpoint': '',
        'prefix': '',
        'key': '',
        'ercWho': '',
        'ercWhere': ''
      }
    }
    this.showPreferences();
  }

  showNotes(): void {
    this.productionNotes = this.productionNotesChild.productionNotes || '';
    this.modalService.open(this.notesDisplay, {
      backdrop: 'static',
      keyboard: true,
      size: 'lg'
    }).result.then((result) => {
      this.productionNotesChild.productionNotes = this.productionNotes;
    },
    (rejected) => {

    });
  }

}
