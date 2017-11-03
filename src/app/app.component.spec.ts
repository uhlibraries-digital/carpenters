import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { NotificationComponent } from 'app/components/notification/notification.component';
import { ActivityComponent } from 'app/components/activity/activity.component';

import { ElectronService } from 'app/services/electron.service';
import { LocalStorageService } from 'app/services/local-storage.service';
import { ExportService } from 'app/services/export.service';
import { ProductionNotesService } from 'app/services/production-notes.service';
import { ActivityService } from 'app/services/activity.service';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        NotificationComponent,
        ActivityComponent
      ],
      providers : [
        ElectronService,
        LocalStorageService,
        ExportService,
        ProductionNotesService,
        ActivityService
      ],
      imports: [
        RouterTestingModule,
        FormsModule
      ]
    }).compileComponents();
  }));
});
