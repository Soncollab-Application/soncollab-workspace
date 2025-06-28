import {Routes} from '@angular/router';
import {NotFoundComponent} from './pages/components/errors/not-found/not-found.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./soncollab/layout/layout.module').then(m => m.LayoutModule)
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];
