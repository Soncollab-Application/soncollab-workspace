import {Component, HostListener, OnInit, OnDestroy} from '@angular/core';
import { Router, RouterLink, RouterLinkActive} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {StickyDirective} from '../../../../../core/utils/directives/sticky.directive';
import {NgClass} from '@angular/common';
import { ThemeService, Theme } from '../../../../../core/services/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  private ticking: boolean = false;
  isScrolled: boolean = false;

  currentLogo: string = '/assets/images/logo/soncollablightlogo.svg';
  isDarkTheme: boolean = false;
  currentTheme: Theme = 'light';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.setupThemeListener();
    this.updateLogoBasedOnTheme();
    this.updateCurrentTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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


  private updateLogoBasedOnTheme(): void {
    this.isDarkTheme = this.themeService.isDarkTheme();

    if (this.isDarkTheme) {
      this.currentLogo = '/assets/images/logo/soncollablightlogo.svg';
    } else {
      this.currentLogo = '/assets/images/logo/soncollabdarklogo.svg';
    }
  }


  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.closeThemeDropdown();
  }


  isThemeActive(theme: Theme): boolean {
    return this.currentTheme === theme;
  }


  private closeThemeDropdown(): void {
    // Méthode 1: Utiliser Bootstrap directement
    const dropdownElement = document.querySelector('.theme-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (dropdownElement) {
      try {
        const bsDropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
        if (bsDropdown) {
          bsDropdown.hide();
        }
      } catch (error) {
        console.warn('Bootstrap Dropdown instance not found, using fallback method');
      }

      // ✅ Retire le focus du bouton dropdown
      dropdownElement.blur();
    }

  }



  getActiveThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'fi-sun';
      case 'dark':
        return 'fi-moon';
      case 'auto':
        return 'fi-monitor'; // ou 'fi-auto' si disponible
      default:
        return 'fi-sun';
    }
  }

  getActiveThemeLabel(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
      default:
        return 'Light';
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.updateScrollState();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  private updateScrollState(): void {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollY > 50;
  }

  public closeMenu(): void {
    if (window.innerWidth < 992) {
      const offcanvasElement = document.getElementById('navbarNav');
      if (offcanvasElement) {
        const closeButton = offcanvasElement.querySelector('.btn-close');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        }
      }
    }
  }

  private isHomePage(url: string): boolean {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return cleanUrl === '/' || cleanUrl === '';
  }

  isSectionActive(baseRoute: string): boolean {
    return this.router.url.startsWith(baseRoute);
  }
}
