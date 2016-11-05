import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { FormsModule }   from '@angular/forms';
import { HttpModule }    from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { IngestComponent } from './ingest/ingest.component';
import { LoggerComponent } from './logger/logger.component';

import { MapService } from './shared/map.service';
import { LocalStorageService } from './shared/local-storage.service';
import { GreensService } from './shared/greens.service';
import { LoggerService } from './shared/logger.service';
import { CsvService } from './shared/csv.service';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot()
  ],
  declarations: [
    AppComponent,
    IngestComponent,
    LoggerComponent
  ],
  providers: [
    MapService,
    LocalStorageService,
    GreensService,
    LoggerService,
    CsvService
  ],
  bootstrap: [ AppComponent ]
})

export class AppModule { }
