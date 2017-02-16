import { Component, ViewEncapsulation, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ipcRenderer } from 'electron';

import { LocalStorageService } from './shared/local-storage.service';
import { ExportService } from './shared/export.service';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styles: [ require('./app.component.scss') ],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

  @ViewChild('preferencesDisplay') preferencesDisplay: any;

  private preferences: any;
  private preferenceIndex: number = 0;

  constructor(
    private storage: LocalStorageService,
    private exportService: ExportService,
    private modalService: NgbModal) {
  }

  ngOnInit(): void {
    this.preferences = this.storage.get('preferences');
    if (!this.preferences) {
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

}
