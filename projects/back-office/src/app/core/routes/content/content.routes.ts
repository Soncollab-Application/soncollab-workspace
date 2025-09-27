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
        path: 'blog',
        loadComponent: () => import('../../../pages/content/blog/my-blog-articles/my-blog-articles').then(c => c.MyBlogArticles)
      },
      {
        path: 'help',
        loadComponent: () => import('../../../pages/content/help/my-help-articles/my-help-articles').then(c => c.MyHelpArticles)
      },
      {
        path: 'categories',
        loadComponent: () => import('../../../pages/content/categories/categories-tags/categories-tags').then(c => c.CategoriesTags)
      },
      {
        path: 'pending',
        loadComponent: () => import('../../../pages/content/pending/pending-validation/pending-validation').then(c => c.PendingValidation)
      },
      {
        path: 'newsletter',
        loadComponent: () => import('../../../pages/content/newsletter/newsletter-management/newsletter-management').then(c => c.NewsletterManagement)
      },
      {
        path: 'analytics',
        loadComponent: () => import('../../../pages/content/analytics/content-analytics/content-analytics').then(c => c.ContentAnalytics)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
