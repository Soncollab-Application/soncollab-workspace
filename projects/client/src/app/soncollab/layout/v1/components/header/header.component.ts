import {Component, HostListener, OnInit, OnDestroy} from '@angular/core';
import { Router, RouterLink, RouterLinkActive} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {NgClass} from '@angular/common';
import { ThemeService, Theme } from '../../../../../core/services/theme.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { Language } from '../../../../../core/models/language.model';
import { Subject, takeUntil } from 'rxjs';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

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

  // Theme properties
  currentLogo: string = '/assets/images/logo/soncollablightlogo.svg';
  isDarkTheme: boolean = false;
  currentTheme: Theme = 'light';

  // Language properties
  supportedLanguages: Language[] = [];
  currentLanguage: string = 'fr';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private contactModalService: ContactModalService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.setupThemeListener();
    this.setupLanguageListener();
    this.initializeLanguage();
    this.updateLogoBasedOnTheme();
    this.updateCurrentTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ======= THEME METHODS =======
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

  openContactModal(): void {
    this.closeMenu();
    this.contactModalService.openContactModal().subscribe()
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
    window.scroll(0,0);
    this.themeService.setTheme(theme);
    this.closeThemeDropdown();
  }

  isThemeActive(theme: Theme): boolean {
    return this.currentTheme === theme;
  }

  private closeThemeDropdown(): void {
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
        return 'fi-monitor';
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

  // ======= LANGUAGE METHODS =======
  private initializeLanguage(): void {
    this.supportedLanguages = this.languageService.getSupportedLanguages();
    this.currentLanguage = this.languageService.getCurrentLanguage();
  }

  private setupLanguageListener(): void {
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((language: string) => {
        this.currentLanguage = language;
      });
  }

  setLanguage(languageCode: string): void {
    if (languageCode && languageCode !== this.currentLanguage) {
      this.languageService.setLanguage(languageCode);
      window.scroll(0, 0);
      this.closeLanguageDropdown();
    }
  }

  isLanguageActive(languageCode: string): boolean {
    return this.currentLanguage === languageCode;
  }

  getCurrentLanguageName(): string {
    const language = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
    return language?.name || this.currentLanguage.toUpperCase();
  }

  getCurrentLanguageFlag(): string {
    // Vous pouvez ajouter des drapeaux si nécessaire
    const flags: { [key: string]: string } = {
      'fr': '🇫🇷',
      'en': '🇺🇸'
    };
    return flags[this.currentLanguage] || '🌐';
  }

  private closeLanguageDropdown(): void {
    const dropdownElement = document.querySelector('.language-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (dropdownElement) {
      try {
        const bsDropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
        if (bsDropdown) {
          bsDropdown.hide();
        }
      } catch (error) {
        console.warn('Bootstrap Dropdown instance not found');
      }
      dropdownElement.blur();
    }
  }

  // ======= SCROLL & NAVIGATION METHODS =======
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
    // Fermer le menu offcanvas mobile (votre code existant)
    if (window.innerWidth < 992) {
      const offcanvasElement = document.getElementById('navbarNav');
      if (offcanvasElement) {
        const closeButton = offcanvasElement.querySelector('.btn-close');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        }
      }
    }

    this.closeAllDropdowns();
  }

  private closeAllDropdowns(): void {
    try {
      // Méthode 1: Utiliser Bootstrap pour fermer tous les dropdowns
      const dropdownElements = document.querySelectorAll('[data-bs-toggle="dropdown"]');
      dropdownElements.forEach((element) => {
        const bsDropdown = (window as any).bootstrap?.Dropdown?.getInstance(element);
        if (bsDropdown) {
          bsDropdown.hide();
        }
        (element as HTMLElement).blur();
      });

      // Méthode 2: Fallback - supprimer les classes 'show' manuellement
      const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
      openDropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
      });

      const activeToggles = document.querySelectorAll('[aria-expanded="true"]');
      activeToggles.forEach(toggle => {
        toggle.setAttribute('aria-expanded', 'false');
      });

    } catch (error) {
      console.warn('Erreur lors de la fermeture des dropdowns:', error);
      document.body.click();
    }
  }

  private isHomePage(url: string): boolean {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return cleanUrl === '/' || cleanUrl === '';
  }

  isSectionActive(baseRoute: string): boolean {
    return this.router.url.startsWith(baseRoute);
  }

  isSectionActiveMany(baseRoutes: string[]): boolean {
    return baseRoutes.some(route => this.router.url.startsWith(route));
  }
}
