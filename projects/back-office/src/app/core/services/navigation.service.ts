import {inject, Injectable} from '@angular/core';
import {AuthService} from './auth.service';
import {SonCollabRoleType} from '../models/auth.model';
import {NavigationConfig} from '../models/navigation-config.model';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private authService = inject(AuthService);


  private navigationConfig: Record<SonCollabRoleType, NavigationConfig[]> = {

    soncollab_admin: [
      {
        type: 'section',
        title: 'aside.sections.management'
      },
      {
        type: 'nav',
        navId: 'sidebarNav',
        items: [
          { key: 'dashboard', icon: 'bi-speedometer2', route: '/admin/dashboard' },
          {
            key: 'team',
            icon: 'bi-people',
            children: [
              { key: 'users', icon: 'bi-person', route: '/admin/team/users' },
              { key: 'invitations', icon: 'bi-envelope', route: '/admin/team/invitations' },
              { key: 'team-stats', icon: 'bi-bar-chart', route: '/admin/team/statistics' }
            ]
          },
          {
            key: 'commercial',
            icon: 'bi-graph-up-arrow',
            children: [
              { key: 'all-contacts', icon: 'bi-list-ul', route: '/admin/commercial/contacts' },
              { key: 'unassigned', icon: 'bi-question-circle', route: '/admin/commercial/unassigned' },
              { key: 'pipeline', icon: 'bi-funnel', route: '/admin/commercial/pipeline' },
              { key: 'quotas-territories', icon: 'bi-target', route: '/admin/commercial/quotas' }
            ]
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        type: 'nav',
        navId: 'sidebarNavContent',
        items: [
          {
            key: 'content',
            icon: 'bi-pencil-square',
            children: [
              { key: 'blog-articles', icon: 'bi-file-text', route: '/admin/content/blog' },
              { key: 'help-articles', icon: 'bi-question-diamond', route: '/admin/content/help' },
              { key: 'categories-tags', icon: 'bi-tags', route: '/admin/content/categories' }
            ]
          }
        ]
      },
      {
        type: 'section',
        title: 'aside.sections.system'
      },
      {
        type: 'nav',
        navId: 'sidebarNavSystem',
        items: [
          {
            key: 'system',
            icon: 'bi-gear',
            children: [
              { key: 'configuration', icon: 'bi-globe', route: '/admin/system/config' },
              { key: 'billing', icon: 'bi-credit-card', route: '/admin/system/billing' },
              { key: 'maintenance', icon: 'bi-wrench', route: '/admin/system/maintenance' }
            ]
          }
        ]
      }
    ],

    soncollab_sales: [
      {
        type: 'section',
        title: 'aside.sections.commercial'
      },
      {
        type: 'nav',
        navId: 'sidebarNav',
        items: [
          { key: 'dashboard', icon: 'bi-speedometer2', route: '/sales/dashboard' },
          { key: 'my-contacts', icon: 'bi-person-lines-fill', route: '/sales/contacts' },
          { key: 'my-pipeline', icon: 'bi-funnel', route: '/sales/pipeline' },
          { key: 'my-proposals', icon: 'bi-file-earmark-richtext', route: '/sales/proposals' }
        ]
      },
      {
        type: 'separator'
      },
      {
        type: 'section',
        title: 'aside.sections.performance'
      },
      {
        type: 'nav',
        navId: 'sidebarNavPerformance',
        items: [
          { key: 'my-quotas', icon: 'bi-bullseye', route: '/sales/quotas' },
          { key: 'my-performance', icon: 'bi-graph-up', route: '/sales/performance' }
        ]
      }
    ],

    soncollab_content: [
      {
        type: 'section',
        title: 'aside.sections.content'
      },
      {
        type: 'nav',
        navId: 'sidebarNav',
        items: [
          { key: 'dashboard', icon: 'bi-speedometer2', route: '/content/dashboard' },
          { key: 'my-blog-articles', icon: 'bi-file-text', route: '/content/blog' },
          { key: 'my-help-articles', icon: 'bi-question-diamond', route: '/content/help' },
          { key: 'categories-tags', icon: 'bi-tags', route: '/content/categories' }
        ]
      },
      {
        type: 'separator'
      },
      {
        type: 'section',
        title: 'aside.sections.workflow'
      },
      {
        type: 'nav',
        navId: 'sidebarNavWorkflow',
        items: [
          { key: 'pending-validation', icon: 'bi-hourglass-split', route: '/content/pending' },
          { key: 'newsletter', icon: 'bi-envelope-paper', route: '/content/newsletter' },
          { key: 'content-analytics', icon: 'bi-bar-chart-line', route: '/content/analytics' }
        ]
      }
    ]
  };

  getNavigationForCurrentUser(): NavigationConfig[] {
    const currentRole = this.authService.currentRole;
    if (!currentRole) return [];
    return this.navigationConfig[currentRole] || [];
  }
}
