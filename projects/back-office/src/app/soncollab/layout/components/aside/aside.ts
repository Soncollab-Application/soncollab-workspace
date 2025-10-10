import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { NavigationConfig, NavigationItem } from '../../../../core/models/navigation-config.model';
import { NavigationService } from '../../../../core/services/navigation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService, Theme, ThemeService, getUserInitials } from 'shared-lib';
import { TranslatePipe } from '@ngx-translate/core';
import { PageTitleService } from '../../../../core/services/page-title.service';
import {SonCollabRoleType} from '../../../../core/models/auth.model';

@Component({
  selector: 'app-aside',
  imports: [RouterLink, TranslatePipe, RouterLinkActive],
  templateUrl: './aside.html',
  styleUrl: './aside.css'
})
export class Aside implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);

  navigationSections = signal<NavigationConfig[]>([]);
  currentUser = computed(() => this.authService.currentUser);

  currentTheme = computed(() => this.themeService.getCurrentTheme());
  isDarkTheme = computed(() => this.themeService.isDark());
  currentLogo = computed(() =>
    this.isDarkTheme()
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg'
  );

  ngOnInit(): void {
    this.loadNavigation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNavigation(): void {
    this.navigationSections.set(this.navigationService.getNavigationForCurrentUser());
  }

  hasActiveChild(item: NavigationItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => this.isActiveRoute(child.route || ''));
  }

  isActiveRoute(route: string): boolean {
    if (!route) return false;
    return this.router.url.startsWith(route);
  }

  getHomeRoute(): string {
    const role = this.authService.currentRole;
    return this.pageTitleService.getDashboardRoute(role as SonCollabRoleType);
  }

  getInitials(): string {
    return getUserInitials(this.currentUser());
  }

  logout(): void {
    this.authService.logout();
  }
}
