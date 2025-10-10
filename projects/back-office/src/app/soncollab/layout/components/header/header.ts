import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { NavigationService } from '../../../../core/services/navigation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageService, ThemeService, getUserInitials, TooltipDirective, Theme } from 'shared-lib';
import { NavigationConfig, NavigationItem } from '../../../../core/models/navigation-config.model';
import { PageTitleService } from '../../../../core/services/page-title.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, TranslateModule, TooltipDirective],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);

  currentTitle = this.pageTitleService.currentTitle;
  navigationSections = signal<NavigationConfig[]>([]);
  currentUser = computed(() => this.authService.currentUser);

  currentTheme = computed(() => this.themeService.getCurrentTheme());
  isDarkTheme = computed(() => this.themeService.isDark());
  currentLogo = computed(() =>
    this.isDarkTheme()
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg'
  );

  currentLanguage = computed(() => this.languageService.currentLanguage());
  supportedLanguages = computed(() => this.languageService.availableLanguages);

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

  toggleTheme(): void {
    const newTheme: Theme = this.isDarkTheme() ? 'light' : 'dark';
    this.themeService.setTheme(newTheme);
  }

  setLanguage(lang: string): void {
    if (lang && lang !== this.currentLanguage()) {
      this.languageService.changeLanguage(lang);
    }
  }

  hasActiveChild(item: NavigationItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => this.isActiveRoute(child.route || ''));
  }

  isActiveRoute(route: string): boolean {
    if (!route) return false;
    return this.router.url.startsWith(route);
  }

  getInitials(): string {
    return getUserInitials(this.currentUser());
  }

  logout(): void {
    this.authService.logout();
  }
}
