import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { dirname } from 'path';

import { ActivityService } from 'app/services/activity.service';
import { ArchivesSpaceService } from 'app/services/archivesspace.service';
import { SaveService } from 'app/services/save.service';
import { LocalStorageService } from 'app/services/local-storage.service';
import { SessionStorageService } from 'app/services/session-storage.service';
import { LoggerService } from 'app/services/logger.service';
import { ElectronService } from 'app/services/electron.service';
import { PreferencesService } from 'app/services/preferences.service';
import { FilesService } from 'app/services/files.service';
import { ExportService } from 'app/services/export.service';
import { DecisionService } from 'app/services/decision.service';

@Component({
  selector: 'archivesspace',
  templateUrl: './archivesspace.component.html',
  styleUrls: [ './archivesspace.component.scss' ]
})
export class ArchivesSpaceComponent implements OnInit {

  repositories: any;
  selectedRepository: string;
  mintSip: boolean;

  resources: any;
  selectedResource: any;
  selectedResourceUri: string;

  @ViewChild('resourceList') resourceList: ElementRef;
  @ViewChild('repositoryList') repositoryList: ElementRef;

  constructor(
    private asService: ArchivesSpaceService,
    private activity: ActivityService,
    private saveService: SaveService,
    private storage: LocalStorageService,
    private session: SessionStorageService,
    private titleService: Title,
    private log: LoggerService,
    private electronService: ElectronService,
    private preferenceService: PreferencesService,
    private exportService: ExportService,
    private decisionService: DecisionService,
    private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'true');

    this.electronService.ipcRenderer.removeAllListeners('save-project');
    this.electronService.ipcRenderer.removeAllListeners('save-as-project');
    this.electronService.ipcRenderer.removeAllListeners('open-project');
    this.electronService.ipcRenderer.removeAllListeners('commit-project');

    this.electronService.ipcRenderer.on('save-project', (event, arg) => {
      this.saveService.save();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
    });
    this.electronService.ipcRenderer.on('save-as-project', (event, arg) => {
      this.saveService.saveLocation = null;
      this.saveService.save();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
    });
    this.electronService.ipcRenderer.on('open-project', (event, arg) => {
      this.saveService.open();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
    });
    this.electronService.ipcRenderer.on('commit-project', (event, arg) => {
      if (!this.saveService.saveLocation) {
        this.log.warn("Please save this project before committing it.");
        return;
      }
      this.activity.start('commit');
      this.asService.commitArtificialItems()
        .then(() => {
          this.saveService.save();
          this.log.info("Project committed");
          this.activity.stop('commit');
        })
        .catch((error) => {
          this.saveService.save();
          this.log.error(error);
          this.activity.stop('commit');
        });
    });

    this.asService.selectedResourceChanged.subscribe((resource) => {
      if (resource === undefined) { return; }

      this.titleService.setTitle(resource.title);
      this.selectedRepository = resource.repository.ref;

      if (!this.resources) {
          this.loadResources(this.selectedRepository);
      }

      this.selectedResource = resource;
      this.selectedResourceUri = resource.uri;
      this.log.info('Resource "' + resource.title + '" loaded', false);
    });

    this.preferenceService.preferencesChange.subscribe((data) => {
      this.asService.clearSession();
      this.loadRepositories();
    });
    this.loadRepositories();

    /* Application always starts here, so this is the only 
       place we need to ask the question to continue export */
    const exportAnswer = sessionStorage.getItem('exportAnswer');

    if (this.exportService.continueExportSip() && !exportAnswer) {
      const complete = this.exportService.exportStatusObjectComplete();
      const message = 
        `It looks like your current export didn't finish.
         Exported ${complete[0]} of ${complete[1]} sip objects.
         Would you like to continue this export? This is the only time I'll ask.`;

      this.decisionService.ask(message);
      this.decisionService.result().then(() => {
        sessionStorage.setItem('exportAnswer', 'yes');
        const project = this.exportService.exportStatusSipProjectLocation();
        this.saveService.open(project);
      })
      .catch(() => {
        sessionStorage.removeItem('exportAnswer');
        this.exportService.exportStatusClear();
      });
    }

    /* For Archival projects, we need to continue export after all the objects
       are loaded from ASpace */
    this.asService.selectedArchivalObjectsChanged.subscribe(() => {
      const exportAnswer = sessionStorage.getItem('exportAnswer');
      if (exportAnswer === 'yes') {
        sessionStorage.removeItem('exportAnswer');
        console.log('Continuing export');
        const exportLocation = this.exportService.exportStatusExportLocation();
        this.exportService.exportPreservation(exportLocation);
      }
    })

  }

  loadRepositories(): void {
    this.activity.start();
    this.asService.getRepositories()
      .then((list) => {
        this.activity.stop();
        this.repositories = list;
        if (list.length >= 1) {
          this.selectedRepository = list[0].uri;
          this.loadResources(this.selectedRepository);
        }
      }).catch((error) => {
        this.activity.stop();
        this.log.error('Unable to load repositories: ' + error);
      });
  }

  loadResources(repository: string): void {
    this.activity.start();
    this.asService.getResources(repository)
      .then((resources) => {
        this.resources = resources.results.sort(function(a, b) {
          return a.title.localeCompare(b.title);
        });
        this.activity.stop();
        if (this.saveService.fromProjectFile()) {
          this.resourceList.nativeElement.disabled = true;
          this.repositoryList.nativeElement.disabled = true;
        }
      })
      .catch((err) => {
        this.activity.stop();
        console.error(err);
        this.log.error('Unable to load resources. Close Carpenters and try again.');
      });
  }

  loadResource(uri: string): void {
    this.activity.start();
    this.asService.getResource(uri)
      .then(() => {
        this.activity.stop();
      }).catch(error => {
        this.activity.stop();
        this.log.error('Unable to load resource: ' + error);
      });
  }

  toggleMintSip(mint: boolean): void {
    this.storage.set('mint_sip', ((mint) ? 'true' : 'false'));
  }
}
