import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ArchivesSpaceComponent } from './components/archivesspace/archivesspace.component';
import { StandardComponent } from './components/standard/standard.component';

const routes: Routes = [
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

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule { }
