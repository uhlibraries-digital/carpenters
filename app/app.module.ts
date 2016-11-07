import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { ArchivesSpaceComponent } from './archivesspace/archivesspace.component';
import { TreeViewComponent } from './archivesspace/tree-view.component';
import { FileViewComponent } from './archivesspace/file-view.component';
import { LoggerComponent } from './logger/logger.component';

import { LocalStorageService } from './shared/local-storage.service';
import { SessionStorageService } from './shared/session-storage.service';
import { ArchivesSpaceService } from './shared/archivesspace.service';
import { MapService } from './shared/map.service';
import { SaveService } from './shared/save.service';
import { ExportService } from './shared/export.service';
import { GreensService } from './shared/greens.service';
import { PreservationService } from './shared/preservation.service';
import { LoggerService } from './shared/logger.service';

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
    LoggerComponent
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
    LoggerService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
