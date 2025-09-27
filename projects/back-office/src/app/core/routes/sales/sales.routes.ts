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
        path: 'contacts',
        loadComponent: () => import('../../../pages/sales/contacts/my-contacts/my-contacts').then(c => c.MyContacts)
      },
      {
        path: 'pipeline',
        loadComponent: () => import('../../../pages/sales/pipeline/my-pipeline/my-pipeline').then(c => c.MyPipeline)
      },
      {
        path: 'proposals',
        loadComponent: () => import('../../../pages/sales/proposals/my-proposals/my-proposals').then(c => c.MyProposals)
      },
      {
        path: 'quotas',
        loadComponent: () => import('../../../pages/sales/quotas/my-quotas/my-quotas').then(c => c.MyQuotas)
      },
      {
        path: 'performance',
        loadComponent: () => import('../../../pages/sales/performance/my-performance/my-performance').then(c => c.MyPerformance)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
