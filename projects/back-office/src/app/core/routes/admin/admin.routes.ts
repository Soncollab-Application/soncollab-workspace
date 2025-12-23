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
        loadComponent: () =>
          import('../../../pages/admin/content/blog/blog-articles/blog-articles').then(c => c.BlogArticles),
        canActivate: [apiPermissionGuard(
          'blog-article',
          'blog-article',
          'find'
        )]
      },
      {
        path: 'content/help',
        loadComponent: () =>
          import('../../../pages/admin/content/help/help-articles/help-articles').then(c => c.HelpArticles),
        canActivate: [apiPermissionGuard(
          'help-article',
          'help-article',
          'find'
        )]
      },
      {
        path: 'content/blog-categories',
        loadComponent: () =>
          import('../../../pages/admin/content/categories/blog-categories/blog-categories').then(c => c.BlogCategories)
      },
      {
        path: 'content/blog-tags',
        loadComponent: () =>
          import('../../../pages/admin/content/categories/blog-tags/blog-tags').then(c => c.BlogTags)
      },
      {
        path: 'content/help-categories',
        loadComponent: () =>
          import('../../../pages/admin/content/categories/help-categories/help-categories').then(c => c.HelpCategories)
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
        path: 'system/billing/dashboard',
        loadComponent: () => import('../../../pages/admin/system/billing-dashboard/billing-dashboard').then(c => c.BillingDashboard),
        canActivate: [apiPermissionGuard('subscription', 'subscription', 'find')]
      },
      {
        path: 'system/billing/plans',
        loadComponent: () => import('../../../pages/admin/system/plans/plans-list/plans-list').then(c => c.PlansList),
        canActivate: [apiPermissionGuard('billing-plan', 'billing-plan', 'find')]
      },
      {
        path: 'system/billing/plans/:documentId',
        loadComponent: () => import('../../../pages/admin/system/plans/plan-detail/plan-detail').then(c => c.PlanDetail),
        canActivate: [apiPermissionGuard('billing-plan', 'billing-plan', 'findOne')]
      },
      {
        path: 'system/billing/addons',
        loadComponent: () => import('../../../pages/admin/system/addons/addons-list/addons-list').then(c => c.AddonsList),
        canActivate: [apiPermissionGuard('plan-addon', 'plan-addon', 'find')]
      },
      {
        path: 'system/billing/addons/:documentId',
        loadComponent: () => import('../../../pages/admin/system/addons/addon-detail/addon-detail').then(c => c.AddonDetail),
        canActivate: [apiPermissionGuard('plan-addon', 'plan-addon', 'findOne')]
      },
      {
        path: 'system/billing/subscriptions',
        loadComponent: () => import('../../../pages/admin/system/subscriptions/subscriptions-list/subscriptions-list').then(c => c.SubscriptionsList),
        canActivate: [apiPermissionGuard('subscription', 'subscription', 'find')]
      },
      {
        path: 'system/billing/subscriptions/:documentId',
        loadComponent: () => import('../../../pages/admin/system/subscriptions/subscription-detail/subscription-detail').then(c => c.SubscriptionDetailPage),
        canActivate: [apiPermissionGuard('subscription', 'subscription', 'findOne')]
      },
      {
        path: 'system/billing/payment-links',
        loadComponent: () => import('../../../pages/admin/system/payment-links/payment-links-list/payment-links-list').then(c => c.PaymentLinksList),
        canActivate: [apiPermissionGuard('subscription-payment-link', 'subscription-payment-link', 'find')]
      },
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
