import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';

export const profileRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'settings',
        loadComponent: () => import('../../../pages/profile/settings/settings').then(c => c.Settings)
      },
    ]
  }
]
