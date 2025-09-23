import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';

export const adminRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../../../pages/admin/admin-dashboard/admin-dashboard').then(c => c.AdminDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
