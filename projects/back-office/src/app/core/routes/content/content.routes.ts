import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';

export const contentRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../../../pages/content/content-dashboard/content-dashboard').then(c => c.ContentDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
