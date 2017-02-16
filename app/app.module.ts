import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { ArchivesSpaceComponent } from './archivesspace/archivesspace.component';
import { TreeViewComponent } from './archivesspace/tree-view.component';
import { FileViewComponent } from './file-manager/file-view.component';
import { FileBrowserComponent } from './file-manager/file-browser.component';
import { LoggerComponent } from './logger/logger.component';
import { ArkEditorComponent } from './ark-editor/ark-editor.component';
import { NotificationComponent } from './notification/notification.component';

import { LocalStorageService } from './shared/local-storage.service';
import { SessionStorageService } from './shared/session-storage.service';
import { ArchivesSpaceService } from './shared/archivesspace.service';
import { MapService } from './shared/map.service';
import { SaveService } from './shared/save.service';
import { ExportService } from './shared/export.service';
import { GreensService } from './shared/greens.service';
import { PreservationService } from './shared/preservation.service';
import { AccessService } from './shared/access.service';
import { LoggerService } from './shared/logger.service';
import { FilesService } from './shared/files.service';
import { CsvService } from './shared/csv.service';

import { FileDraggable } from './file-manager/file-draggable.directive';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot()
  ],
  declarations: [
    AppComponent,
    ArchivesSpaceComponent,
    TreeViewComponent,
    FileViewComponent,
    FileBrowserComponent,
    LoggerComponent,
    ArkEditorComponent,
    NotificationComponent,
    FileDraggable
  ],
  providers: [
    LocalStorageService,
    SessionStorageService,
    ArchivesSpaceService,
    MapService,
    SaveService,
    ExportService,
    GreensService,
    PreservationService,
    AccessService,
    LoggerService,
    FilesService,
    CsvService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
