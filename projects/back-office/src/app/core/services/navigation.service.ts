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
          { key: 'dashboard', icon: 'dashboard_2', route: '/admin/dashboard' },
          {
            key: 'team',
            icon: 'group',
            children: [
              { key: 'users', icon: 'person', route: '/admin/team/users' },
              { key: 'invitations', icon: 'mail', route: '/admin/team/invitations' },
            ]
          },
          {
            key: 'commercial',
            icon: 'trending_up',
            children: [
              { key: 'all-contacts', icon: 'list', route: '/admin/commercial/contacts' },
              { key: 'unassigned', icon: 'help_outline', route: '/admin/commercial/unassigned' },
              { key: 'pipeline', icon: 'filter_list', route: '/admin/commercial/pipeline' },
              { key: 'quotas-territories', icon: 'track_changes', route: '/admin/commercial/quotas' }
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
            icon: 'edit_note',
            children: [
              { key: 'blog-articles', icon: 'article', route: '/admin/content/blog' },
              { key: 'help-articles', icon: 'help', route: '/admin/content/help' },
              { key: 'blog-categories', icon: 'label', route: '/admin/content/blog-categories' },
              { key: 'help-categories', icon: 'label', route: '/admin/content/help-categories' },
              { key: 'blog-tags', icon: 'label', route: '/admin/content/blog-tags' },
            ],
          },
          { key: 'media-library', icon: 'perm_media', route: '/media' }
        ],
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
            icon: 'settings',
            children: [
              { key: 'configuration', icon: 'public', route: '/admin/system/config' },
              { key: 'billing', icon: 'credit_card', route: '/admin/system/billing' },
              { key: 'maintenance', icon: 'build', route: '/admin/system/maintenance' }
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
          { key: 'dashboard', icon: 'dashboard', route: '/sales/dashboard' },
          { key: 'my-contacts', icon: 'contacts', route: '/sales/contacts' },
          { key: 'my-pipeline', icon: 'filter_list', route: '/sales/pipeline' },
          { key: 'my-proposals', icon: 'description', route: '/sales/proposals' },
          { key: 'media-library', icon: 'perm_media', route: '/media' }
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
          { key: 'my-quotas', icon: 'adjust', route: '/sales/quotas' },
          { key: 'my-performance', icon: 'show_chart', route: '/sales/performance' }
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
          { key: 'dashboard', icon: 'dashboard', route: '/content/dashboard' },
          { key: 'my-blog-articles', icon: 'article', route: '/content/blog' },
          { key: 'my-help-articles', icon: 'help', route: '/content/help' },
          { key: 'categories-tags', icon: 'label', route: '/content/categories' },
          { key: 'media-library', icon: 'perm_media', route: '/media' }
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
          { key: 'pending-validation', icon: 'pending', route: '/content/pending' },
          { key: 'newsletter', icon: 'email', route: '/content/newsletter' },
          { key: 'content-analytics', icon: 'analytics', route: '/content/analytics' }
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
