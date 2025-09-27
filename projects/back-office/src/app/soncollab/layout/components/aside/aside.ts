import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {NavigationConfig, NavigationItem} from '../../../../core/models/navigation-config.model';
import {NavigationService} from '../../../../core/services/navigation.service';
import {AuthService} from '../../../../core/services/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import { LanguageService, Theme, ThemeService} from 'shared-lib';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-aside',
  imports: [
    RouterLink,
    TranslatePipe,
    RouterLinkActive
  ],
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
  currentLogo: string = '/assets/images/logo/soncollablightlogo.svg';
  isDarkTheme: boolean = false;
  currentTheme: Theme = 'light';

  navigationSections = signal<NavigationConfig[]>([]);
  currentUser = computed(() => this.authService.currentUser);

  ngOnInit(): void {
    this.loadNavigation();
    this.setupLanguageListener();
    this.setupThemeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNavigation(): void {
    this.navigationSections.set(this.navigationService.getNavigationForCurrentUser());
  }

  private setupLanguageListener(): void {
    this.languageService.languageChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {

      });
  }

  private updateLogoBasedOnTheme(): void {
    this.isDarkTheme = this.themeService.isDarkTheme();

    if (this.isDarkTheme) {
      this.currentLogo = '/assets/images/logo/soncollablightlogo.svg';
    } else {
      this.currentLogo = '/assets/images/logo/soncollabdarklogo.svg';
    }
  }

  private setupThemeListener(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateLogoBasedOnTheme();
        this.updateCurrentTheme();
      });
  }

  private updateCurrentTheme(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
  }


  getInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';

    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasActiveChild(item: NavigationItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => child.route && this.isActiveRoute(child.route));
  }

  logout(): void {
    this.authService.logout();
  }

  getHomeRoute(): string {
    const currentRole = this.authService.currentRole;
    switch (currentRole) {
      case 'soncollab_admin':
        return '/admin/dashboard';
      case 'soncollab_sales':
        return '/sales/dashboard';
      case 'soncollab_content':
        return '/content/dashboard';
      default:
        return '/';
    }
  }

}
