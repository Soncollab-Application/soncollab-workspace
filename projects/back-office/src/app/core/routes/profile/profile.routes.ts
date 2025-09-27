import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';

export const profileRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'settings',
        loadComponent: () => import('../../../pages/profile/settings/profile-settings/profile-settings').then(c => c.ProfileSettings)
      },
      {
        path: 'security',
        loadComponent: () => import('../../../pages/profile/security/security-settings/security-settings').then(c => c.SecuritySettings)
      },
      {
        path: 'notifications',
        loadComponent: () => import('../../../pages/profile/notifications/notification-settings/notification-settings').then(c => c.NotificationSettings)
      },
      {
        path: '',
        redirectTo: 'settings',
        pathMatch: 'full'
      }
    ]
  }
]
