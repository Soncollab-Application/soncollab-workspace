import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';

export const salesRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../../../pages/sales/sales-dashboard/sales-dashboard').then(c => c.SalesDashboard)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
