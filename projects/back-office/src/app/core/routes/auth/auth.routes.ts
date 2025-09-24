import {Routes} from '@angular/router';
import {guestGuard} from '../../guards/guest.guard';
import {Auth} from '../../layout/auth/auth';

export const authRoutes: Routes = [

  {
    path: '',
    component: Auth,
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('../../../pages/auth/login/login').then(c => c.Login)
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () => import('../../../pages/auth/forgot-password/forgot-password').then(c => c.ForgotPassword)
      },
      {
        path: 'reset-password',
        canActivate: [guestGuard],
        loadComponent: () => import('../../../pages/auth/reset-password/reset-password').then(c => c.ResetPassword)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  }

];
