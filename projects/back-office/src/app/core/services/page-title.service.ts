// projects/back-office/src/app/core/services/page-title.service.ts

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

  private customBreadcrumbsSource = signal<BreadcrumbItem[]>([]);
  private customTitleSource = signal<string>('');

  // Mapping des routes vers les titres
  private routeTitleMap: Record<string, string> = {
    // Admin
    '/admin/dashboard': 'header.pages.admin.dashboard',
    '/admin/team/users': 'header.pages.admin.team.users',
    '/admin/team/invitations': 'header.pages.admin.team.invitations',
    '/admin/commercial/contacts': 'header.pages.admin.commercial.contacts',
    '/admin/commercial/unassigned': 'header.pages.admin.commercial.unassigned',
    '/admin/commercial/pipeline': 'header.pages.admin.commercial.pipeline',
    '/admin/commercial/quotas': 'header.pages.admin.commercial.quotas',
    '/admin/content/blog': 'header.pages.admin.content.blog',
    '/admin/content/help': 'header.pages.admin.content.help',
    '/admin/content/help-categories': 'header.pages.admin.content.help-categories',
    '/admin/content/blog-categories': 'header.pages.admin.content.blog-categories',
    '/admin/content/blog-tags': 'header.pages.admin.content.blog-tags',
    '/admin/system/billing/dashboard': 'header.pages.admin.system.billing-dashboard',
    '/admin/system/billing/plans': 'header.pages.admin.system.plans',
    '/admin/system/billing/addons': 'header.pages.admin.system.addons',
    '/admin/system/billing/features': 'header.pages.admin.system.features-list',
    '/admin/system/billing/subscriptions': 'header.pages.admin.system.subscriptions',
    '/admin/system/billing/payment-links': 'header.pages.admin.system.payment-links',
    '/admin/system/billing/invoices': 'header.pages.admin.system.invoices-list',
    '/admin/system/billing/transactions': 'header.pages.admin.system.transactions-list',
    '/admin/system/config': 'header.pages.admin.system.config',
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
    '/profile/notifications': 'header.pages.profile.notifications',

    // Media (commun à tous les rôles)
    '/media': 'header.pages.media.library',
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

      // Si on a des breadcrumbs custom, les retraduire
      if (this.hasCustomBreadcrumbs()) {
        this.refreshCustomBreadcrumbs();
      } else if (this.currentUrl) {
        this.updateTitleFromRoute(this.currentUrl);
      }
    });
  }

  // Retraduire les breadcrumbs custom
  private refreshCustomBreadcrumbs(): void {
    const items = this.customBreadcrumbsSource();
    if (items.length > 0) {
      this.breadcrumbs.set([...items]);
    }

    const titleSource = this.customTitleSource();
    if (titleSource) {
      this.currentTitle.set(titleSource);
    }
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

    this.translate.get('common.home').subscribe(homeLabel => {
      const breadcrumbItems: BreadcrumbItem[] = [
        { label: homeLabel, route: dashboardRoute, active: false }
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
    });
  }

  getDashboardRoute(role: string): string {
    const dashboardRoutes: Record<string, string> = {
      'soncollab_admin': '/admin/dashboard',
      'soncollab_sales': '/sales/dashboard',
      'soncollab_content': '/content/dashboard'
    };
    return dashboardRoutes[role] || '/admin/dashboard';
  }

  setCustomTitle(titleKey: string, params?: any): void {
    this.translate.get(titleKey, params).subscribe(title => {
      this.currentTitle.set(title);
    });
  }

  //  Stocker les breadcrumbs pour retraduction
  setCustomBreadcrumbs(items: BreadcrumbItem[]): void {
    this.customBreadcrumbsSource.set(items);
    this.breadcrumbs.set(items);
    this.hasCustomBreadcrumbs.set(true);
  }

  // Stocker le titre pour retraduction
  setTitle(title: string): void {
    this.customTitleSource.set(title);
    this.currentTitle.set(title);
  }

  resetBreadcrumbs(): void {
    this.hasCustomBreadcrumbs.set(false);
    this.customBreadcrumbsSource.set([]);
    this.customTitleSource.set('');
    if (this.currentUrl) {
      this.updateTitleFromRoute(this.currentUrl);
    }
  }

  clearCustomBreadcrumbs(): void {
    this.resetBreadcrumbs();
  }
}
