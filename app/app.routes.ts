import { Routes } from '@angular/router';

import { ArchivesSpaceComponent } from './archivesspace/archivesspace.component';
import { StandardComponent } from './standard/standard.component';

export const AppRoutes: Routes = [
  {
    path: '',
    component: ArchivesSpaceComponent
  },
  {
    path: 'findingaid',
    component: ArchivesSpaceComponent
  },
  {
    path: 'standard',
    component: StandardComponent
  }
];