import { Injectable, inject, signal, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LanguageService } from 'shared-lib';
import {SonCollabRoleType} from '../models/auth.model';

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
  private languageService = inject(LanguageService);

  private currentUrl = '';

  // Signals pour la réactivité
  currentTitle = signal<string>('');
  breadcrumbs = signal<BreadcrumbItem[]>([]);
  private hasCustomBreadcrumbs = signal<boolean>(false);

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

    // Profile
    '/profile/overview': 'header.pages.profile.overview',
    '/profile/security': 'header.pages.profile.security',
    '/profile/notifications': 'header.pages.profile.notifications'
  };

  constructor() {
    this.initializeTitleTracking();
    this.setupLanguageEffect();
  }

  private initializeTitleTracking(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl = event.urlAfterRedirects;
        if (!this.hasCustomBreadcrumbs()) {
          this.updateTitleFromRoute(this.currentUrl);
        }
      });
  }

  private setupLanguageEffect(): void {
    effect(() => {
      const lang = this.languageService.currentLanguage();
      if (this.currentUrl) {
        this.updateTitleFromRoute(this.currentUrl);
      }
    });
  }

  private updateTitleFromRoute(url: string): void {
    const matchedRoute = this.findMatchingRoute(url);
    if (matchedRoute) {
      this.translate.get(matchedRoute).subscribe(title => {
        this.currentTitle.set(title);
        this.generateBreadcrumbs(url);
      });
    }
  }

  private findMatchingRoute(url: string): string | null {
    const cleanUrl = url.split('?')[0];
    return this.routeTitleMap[cleanUrl] || null;
  }

  private generateBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(s => s);
    const role = this.authService.currentRole;
    const dashboardRoute = this.getDashboardRoute(role as SonCollabRoleType);

    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Home', route: dashboardRoute, active: false }
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const titleKey = this.routeTitleMap[currentPath];

      if (titleKey) {
        this.translate.get(titleKey).subscribe(label => {
          breadcrumbItems.push({
            label,
            route: currentPath,
            active: index === segments.length - 1
          });
        });
      }
    });

    this.breadcrumbs.set(breadcrumbItems);
  }

  // Méthode pour obtenir la route du dashboard selon le rôle
  getDashboardRoute(role: string): string {
    const dashboardRoutes: Record<string, string> = {
      'soncollab_admin': '/admin/dashboard',
      'soncollab_sales': '/sales/dashboard',
      'soncollab_content': '/content/dashboard'
    };
    return dashboardRoutes[role] || '/admin/dashboard';
  }

  // Méthode pour définir un titre personnalisé
  setCustomTitle(titleKey: string, params?: any): void {
    this.translate.get(titleKey, params).subscribe(title => {
      this.currentTitle.set(title);
    });
  }

  // Méthode pour définir des breadcrumbs personnalisés
  setCustomBreadcrumbs(items: BreadcrumbItem[]): void {
    this.breadcrumbs.set(items);
    this.hasCustomBreadcrumbs.set(true);
  }

  // Méthode pour réinitialiser les breadcrumbs
  resetBreadcrumbs(): void {
    this.hasCustomBreadcrumbs.set(false);
    if (this.currentUrl) {
      this.updateTitleFromRoute(this.currentUrl);
    }
  }

  // Alias pour compatibilité
  clearCustomBreadcrumbs(): void {
    this.resetBreadcrumbs();
  }
}
