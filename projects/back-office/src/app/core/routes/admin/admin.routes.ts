import {Routes} from '@angular/router';
import {Layout} from '../../../soncollab/layout/layout';
import {pluginPermissionGuard, apiPermissionGuard} from "shared-lib";

export const adminRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../../../pages/admin/admin-dashboard/admin-dashboard').then(c => c.AdminDashboard)
      },

      // Équipe
      {
        path: 'team/users',
        loadComponent: () => import('../../../pages/admin/team/users/users-list/users-list').then(c => c.UsersList),
        canActivate: [pluginPermissionGuard(
          'users-permissions',
          'user',
          'find'
        )]
      },
      {
        path: 'team/users/:documentId',
        loadComponent: () => import('../../../pages/admin/team/users/user-detail/user-detail').then(c => c.UserDetail),
        canActivate: [pluginPermissionGuard(
          'users-permissions',
          'user',
          'findOne'
        )]
      },
      {
        path: 'team/invitations',
        loadComponent: () => import('../../../pages/admin/team/invitations/invitations-list/invitations-list').then(c => c.InvitationsList),
        canActivate: [apiPermissionGuard(
          'soncollab-invitation',
          'soncollab-invitation',
          'find'
        )]
      },
      {
        path: 'team/invitations/:documentId',
        loadComponent: () => import('../../../pages/admin/team/invitations/invitation-detail/invitation-detail').then(c => c.InvitationDetail),
        canActivate: [apiPermissionGuard(
          'soncollab-invitation',
          'soncollab-invitation',
          'findOne'
        )]
      },

      // Commercial
      {
        path: 'commercial/contacts/:documentId',
        loadComponent: () => import('../../../pages/admin/commercial/contacts/contact-detail/contact-detail').then(c => c.ContactDetail),
        canActivate: [apiPermissionGuard(
          'sales-contact',
          'sales-contact',
          'findOne'
        )]
      },
      {
        path: 'commercial/contacts',
        loadComponent: () => import('../../../pages/admin/commercial/contacts/all-contacts/all-contacts').then(c => c.AllContacts),
        canActivate: [apiPermissionGuard(
          'sales-contact',
          'sales-contact',
          'find'
        )]
      },
      {
        path: 'commercial/unassigned',
        loadComponent: () => import('../../../pages/admin/commercial/unassigned/unassigned-contacts/unassigned-contacts').then(c => c.UnassignedContacts),
        canActivate: [apiPermissionGuard(
          'sales-contact',
          'sales-contact',
          'getUnassigned'
        )]
      },
      {
        path: 'commercial/pipeline',
        loadComponent: () => import('../../../pages/admin/commercial/pipeline/sales-pipeline/sales-pipeline').then(c => c.SalesPipeline),
        canActivate: [apiPermissionGuard(
          'sales-contact',
          'sales-contact',
          'getInboundQueue'
        )]
      },
      {
        path: 'commercial/quotas/:documentId',
        loadComponent: () => import('../../../pages/admin/commercial/quotas/quota-detail/quota-detail').then(c => c.QuotaDetail),
        canActivate: [apiPermissionGuard(
          'sales-quota',
          'sales-quota',
          'findOne'
        )]
      },
      {
        path: 'commercial/quotas',
        loadComponent: () => import('../../../pages/admin/commercial/quotas/quotas-territories/quotas-territories').then(c => c.QuotasTerritories),
        canActivate: [apiPermissionGuard(
          'sales-quota',
          'sales-quota',
          'find'
        )]
      },
      {
        path: 'commercial/statistics',
        loadComponent: () => import('../../../pages/admin/commercial/statistics/sales-statistics/sales-statistics').then(c => c.SalesStatistics)
      },

      // Contenu
      {
        path: 'content/blog',
        loadComponent: () => import('../../../pages/admin/content/blog/blog-articles/blog-articles').then(c => c.BlogArticles)
      },
      {
        path: 'content/help',
        loadComponent: () => import('../../../pages/admin/content/help/help-articles/help-articles').then(c => c.HelpArticles)
      },
      {
        path: 'content/categories',
        loadComponent: () => import('../../../pages/admin/content/categories/categories-tags/categories-tags').then(c => c.CategoriesTags)
      },
      {
        path: 'content/workflow',
        loadComponent: () => import('../../../pages/admin/content/workflow/validation-workflow/validation-workflow').then(c => c.ValidationWorkflow)
      },
      {
        path: 'content/analytics',
        loadComponent: () => import('../../../pages/admin/content/analytics/content-analytics/content-analytics').then(c => c.ContentAnalytics)
      },

      // Système
      {
        path: 'system/config',
        loadComponent: () => import('../../../pages/admin/system/config/system-config/system-config').then(c => c.SystemConfig)
      },
      {
        path: 'system/billing',
        loadComponent: () => import('../../../pages/admin/system/billing/billing-management/billing-management').then(c => c.BillingManagement)
      },
      {
        path: 'system/maintenance',
        loadComponent: () => import('../../../pages/admin/system/maintenance/system-maintenance/system-maintenance').then(c => c.SystemMaintenance)
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: '**',
        loadComponent: () => import('../../../core/components/not-found/not-found').then(c => c.NotFound)
      }
    ]
  }
];
