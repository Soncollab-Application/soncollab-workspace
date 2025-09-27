import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PageTitleService {
  private router = inject(Router);
  private translate = inject(TranslateService);
  private authService = inject(AuthService);

  // Signals pour la réactivité
  currentTitle = signal<string>('');
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  // Mapping des routes vers les titres
  private routeTitleMap: Record<string, string> = {
    // Admin
    '/admin/dashboard': 'header.pages.admin.dashboard',
    '/admin/team/users': 'header.pages.admin.team.users',
    '/admin/team/invitations': 'header.pages.admin.team.invitations',
    '/admin/team/statistics': 'header.pages.admin.team.statistics',
    '/admin/commercial/contacts': 'header.pages.admin.commercial.contacts',
    '/admin/commercial/unassigned': 'header.pages.admin.commercial.unassigned',
    '/admin/commercial/pipeline': 'header.pages.admin.commercial.pipeline',
    '/admin/commercial/quotas': 'header.pages.admin.commercial.quotas',
    '/admin/content/blog': 'header.pages.admin.content.blog',
    '/admin/content/help': 'header.pages.admin.content.help',
    '/admin/system/config': 'header.pages.admin.system.config',
    '/admin/system/billing': 'header.pages.admin.system.billing',
    '/admin/system/maintenance': 'header.pages.admin.system.maintenance',

    // Sales
    '/sales/dashboard': 'header.pages.sales.dashboard',
    '/sales/contacts': 'header.pages.sales.contacts',
    '/sales/pipeline': 'header.pages.sales.pipeline',
    '/sales/proposals': 'header.pages.sales.proposals',
    '/sales/quotas': 'header.pages.sales.quotas',
    '/sales/performance': 'header.pages.sales.performance',

    // Content
    '/content/dashboard': 'header.pages.content.dashboard',
    '/content/blog': 'header.pages.content.blog',
    '/content/help': 'header.pages.content.help',
    '/content/categories': 'header.pages.content.categories',
    '/content/pending': 'header.pages.content.pending',
    '/content/newsletter': 'header.pages.content.newsletter',
    '/content/analytics': 'header.pages.content.analytics',

    // Profile
    '/profile/settings': 'header.pages.profile.settings',
    '/profile/security': 'header.pages.profile.security',
    '/profile/notifications': 'header.pages.profile.notifications'
  };

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => (event as NavigationEnd).url)
      )
      .subscribe(url => {
        this.updatePageInfo(url);
      });
  }

  private updatePageInfo(url: string): void {
    // Met à jour le titre
    const titleKey = this.routeTitleMap[url] || 'header.pages.default';
    this.translate.get(titleKey).subscribe(title => {
      this.currentTitle.set(title);
    });

    // Génère les breadcrumbs
    this.generateBreadcrumbs(url);
  }

  private generateBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(s => s);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Dashboard principal selon le rôle
    const role = this.authService.currentRole;
    if (role) {
      const dashboardRoute = this.getDashboardRoute(role);
      breadcrumbs.push({
        label: this.translate.instant('header.breadcrumbs.dashboard'),
        route: dashboardRoute,
        active: url === dashboardRoute
      });
    }

    // Construit les breadcrumbs selon les segments
    if (segments.length > 2) {
      let currentRoute = '';

      segments.slice(1).forEach((segment, index) => {
        currentRoute += `/${segments[0]}/${segment}`;
        const isLast = index === segments.length - 2;

        breadcrumbs.push({
          label: this.translate.instant(`header.breadcrumbs.${segment}`),
          route: isLast ? undefined : currentRoute,
          active: isLast
        });
      });
    }

    this.breadcrumbs.set(breadcrumbs);
  }

  private getDashboardRoute(role: string): string {
    switch (role) {
      case 'soncollab_admin': return '/admin/dashboard';
      case 'soncollab_sales': return '/sales/dashboard';
      case 'soncollab_content': return '/content/dashboard';
      default: return '/';
    }
  }

  // Méthode pour définir un titre personnalisé
  setCustomTitle(title: string): void {
    this.currentTitle.set(title);
  }

  // Méthode pour définir des breadcrumbs personnalisés
  setCustomBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    this.breadcrumbs.set(breadcrumbs);
  }
}
