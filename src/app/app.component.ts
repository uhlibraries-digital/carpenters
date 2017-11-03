import { Component, ViewEncapsulation, OnInit, ViewChild, HostListener } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ElectronService } from './services/electron.service';
import { LocalStorageService } from './services/local-storage.service';
import { ExportService } from './services/export.service';
import { ProductionNotesService } from './services/production-notes.service';
import { ActivityService } from './services/activity.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild('preferencesDisplay') preferencesDisplay: any;
  @ViewChild('notesDisplay') notesDisplay: any;

  private preferences: any;
  private preferenceIndex: number = 0;

  private productionNotes: string = '';
  private productionNotesChild: any;

  private quitting = false;

  constructor(
    private storage: LocalStorageService,
    private exportService: ExportService,
    private modalService: NgbModal,
    private notes: ProductionNotesService,
    private activity: ActivityService,
    public electronService: ElectronService) { }

    @HostListener('window:beforeunload') checkActivity(event) {
      this.quitting = true;
      return this.activity.finished('save');
    }

    ngOnInit(): void {
      this.preferences = this.storage.get('preferences');
      if ((typeof this.preferences) !== 'object' || !this.preferences) {
        this.setupPreferences();
      }
      this.electronService.ipcRenderer.on('show-preferences', (event, arg) => {
        this.showPreferences();
      });
      this.electronService.ipcRenderer.on('export-preservation', (event, arg) => {
        this.exportService.exportPreservation();
      });
      this.electronService.ipcRenderer.on('export-access', (event, arg) => {
        this.exportService.exportAccess();
      });
      this.electronService.ipcRenderer.on('export-both', (event, arg) => {
        this.exportService.exportBoth();
      });
      this.electronService.ipcRenderer.on('show-notes', (event, arg) => {
        this.showNotes();
      });

      this.notes.displayNote.subscribe((child) => {
        this.productionNotesChild = child;
        this.electronService.webContents.getFocusedWebContents().send('show-notes');
      });

      this.activity.finishedKey.subscribe((key) => {
        if (key === 'save' && this.quitting) {
          let win = this.electronService.remote.getCurrentWindow();
          win.close();
        }
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
