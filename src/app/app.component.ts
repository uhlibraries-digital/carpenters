import { Component, ViewEncapsulation, OnInit, ViewChild, HostListener } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { PromptComponent } from './components/prompt/prompt.component';

import { ElectronService } from './services/electron.service';
import { ExportService } from './services/export.service';
import { ProductionNotesService } from './services/production-notes.service';
import { ActivityService } from './services/activity.service';
import { LoggerService } from './services/logger.service';
import { PreferencesService } from './services/preferences.service';
import { ArchivesSpaceService } from './services/archivesspace.service';
import { StandardItemService } from './services/standard-item.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  @ViewChild('preferencesDisplay') preferencesDisplay: any;
  @ViewChild('notesDisplay') notesDisplay: any;

  private preferences: any;
  private preferenceIndex: number = 0;

  private productionNotes: string = '';
  private productionNotesChild: any;

  private quitting = false;

  selectedResource: any;

  constructor(
    private preferenceService: PreferencesService,
    private exportService: ExportService,
    private modalService: NgbModal,
    private notes: ProductionNotesService,
    private activity: ActivityService,
    public electronService: ElectronService,
    private log: LoggerService,
    private asService: ArchivesSpaceService,
    private standardItem: StandardItemService) {

      this.asService.selectedResourceChanged.subscribe(resource => this.selectedResource = resource);
      this.standardItem.resourceChanged.subscribe(resource => this.selectedResource = resource);

  }

    @HostListener('window:beforeunload') checkActivity(event) {
      this.quitting = true;
      let saving = !this.activity.finished('save');
      if (saving) {
        this.log.warn('Hold on while your project is being saved...')
      }
      return !saving
    }

    ngOnInit(): void {
      this.preferenceService.preferencesChange.subscribe((data) => {
        this.preferences = data;
      });
      this.preferenceService.load();
      if (this.preferenceService.new) {
        this.showPreferences();
      }

      this.electronService.ipcRenderer.on('show-preferences', (event, arg) => {
        this.showPreferences();
      });
      this.electronService.ipcRenderer.on('export-preservation', (event, arg) => {
        this.promptAic().then(() => {
          this.exportService.exportPreservation();
        }).catch(() => { });
      });
      this.electronService.ipcRenderer.on('export-shot-list', (event, arg) => {
        this.exportService.exportShotList();
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
        this.preferenceService.set(this.preferences);
      },
      (rejected) => {
        this.preferences = this.preferenceService.data;
      });
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

    promptAic(): Promise<void> {
      const promptRef = this.modalService.open(PromptComponent, {
        backdrop: 'static',
        windowClass: 'prompt-modal'
      });
      promptRef.componentInstance.message = 'Enter Archival Information Collection (AIC)';
      promptRef.componentInstance.value = this.selectedResource ? this.selectedResource.aic || '' : '';
      promptRef.componentInstance.okButtonText = 'Continue';

      return promptRef.result.then((result) => {
        if (this.selectedResource) {
          this.selectedResource.aic = result;
        }
      }, (reason) => { return Promise.reject(reason); });
    }
}
