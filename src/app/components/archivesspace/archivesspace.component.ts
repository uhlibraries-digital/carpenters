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
    private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'true');

    this.electronService.ipcRenderer.removeAllListeners('save-project');
    this.electronService.ipcRenderer.removeAllListeners('save-as-project');
    this.electronService.ipcRenderer.removeAllListeners('open-project');

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
        this.log.warn("Please save this project before commiting it.");
        return;
      }
      this.saveService.save();
      this.filesService.createFolderHierarchy(dirname(this.saveService.saveLocation));
      this.log.info("Project committed");
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
    this.asService.getResources(repository).then((resources) => {
      this.resources = resources.results.sort(function(a, b) {
        return a.title.localeCompare(b.title);
      });
      this.activity.stop();
      if (this.saveService.fromProjectFile()) {
        this.resourceList.nativeElement.disabled = true;
        this.repositoryList.nativeElement.disabled = true;
      }
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
