import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ipcRenderer } from 'electron';

import { ActivityService } from '../shared/activity.service';
import { ArchivesSpaceService } from '../shared/archivesspace.service';
import { SaveService } from '../shared/save.service';
import { LocalStorageService } from '../shared/local-storage.service';
import { SessionStorageService } from '../shared/session-storage.service';
import { LoggerService } from '../shared/logger.service';

@Component({
  selector: 'archivesspace',
  templateUrl: './archivesspace/archivesspace.component.html',
  styles: [ require('./archivesspace.component.scss') ]
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
    private log: LoggerService) {
  }

  ngOnInit(): void {
    this.mintSip = this.storage.get('mint_sip');
    this.session.set('findingaid', 'true');

    ipcRenderer.removeAllListeners('save-project');
    ipcRenderer.removeAllListeners('save-as-project');
    ipcRenderer.removeAllListeners('open-project');

    ipcRenderer.on('save-project', (event, arg) => {
      this.saveService.save();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
    });
    ipcRenderer.on('save-as-project', (event, arg) => {
      this.saveService.saveLocation = null;
      this.saveService.save();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
    });
    ipcRenderer.on('open-project', (event, arg) => {
      this.saveService.open();
      this.resourceList.nativeElement.disabled = true;
      this.repositoryList.nativeElement.disabled = true;
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

    this.storage.changed.subscribe(key => {
      if (key === 'preferences') {
        this.loadRepositories();
      }
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
