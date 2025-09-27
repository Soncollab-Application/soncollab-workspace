import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {NavigationService} from '../../../../core/services/navigation.service';
import {AuthService} from '../../../../core/services/auth.service';
import {LanguageService, ThemeService } from 'shared-lib';
import {NavigationConfig} from '../../../../core/models/navigation-config.model';
import {PageTitleService} from '../../../../core/services/page-title.service';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NgbPopover,
  ],
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


  navigationSections = signal<NavigationConfig[]>([]);
  currentUser = computed(() => this.authService.currentUser);
  currentLanguage = signal('fr');
  isDarkTheme = signal(false);
  currentLogo: string = '/assets/images/logo/soncollablightlogo.svg';
  currentTitle = this.pageTitleService.currentTitle;

  ngOnInit(): void {
    this.loadNavigation();
    this.setupListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNavigation(): void {
    this.navigationSections.set(this.navigationService.getNavigationForCurrentUser());
  }

  private setupListeners(): void {
    // Language listener
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => this.currentLanguage.set(lang));

    // Theme listener
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.isDarkTheme.set(theme === 'dark');
        this.updateLogo();
      });
  }

  setLanguage(lang: string): void {
    this.languageService.setLanguage(lang);
  }

  private updateLogo(): void {
    this.currentLogo = this.isDarkTheme()
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg';
  }


  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasActiveChild(item: any): boolean {
    if (!item.children) return false;
    return item.children.some((child: any) => child.route && this.isActiveRoute(child.route));
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';

    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }


  logout(): void {
    this.authService.logout();
  }
}
