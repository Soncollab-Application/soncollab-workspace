import { Routes } from '@angular/router';
import {guestGuard} from './core/guards/guest.guard';
import {authGuard} from './core/guards/auth.guard';
import {roleGuard} from './core/guards/role.guard';

export const routes: Routes = [
  // Routes publiques (invités uniquement)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./core/routes/auth/auth.routes').then(r => r.authRoutes)
  },

  // Routes protégées - Administration
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['soncollab_admin'] },
    loadChildren: () => import('./core/routes/admin/admin.routes').then(r => r.adminRoutes)
  },

  // Routes protégées - Contenu
  {
    path: 'content',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['soncollab_content'] },
    loadChildren: () => import('./core/routes/content/content.routes').then(r => r.contentRoutes)
  },

  // Routes protégées - Ventes
  {
    path: 'sales',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['soncollab_sales'] },
    loadChildren: () => import('./core/routes/sales/sales.routes').then(r => r.salesRoutes)
  },

  // Routes communes (tous les utilisateurs connectés)
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('./core/routes/profile/profile.routes').then(r => r.profileRoutes)
  },

  // Redirections par défaut
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/components/redirect/redirect').then(c => c.Redirect)
  },

  // Route de fallback
  {
    path: '**',
    loadComponent: () => import('./core/components/not-found/not-found').then(c => c.NotFound)
  }
];
