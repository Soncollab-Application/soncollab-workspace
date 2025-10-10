import { Component, HostListener, OnDestroy, inject, computed, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgClass } from '@angular/common';
import { Subject } from 'rxjs';
import { ContactModalService } from '../../../../../core/services/contact-modal.service';
import { LanguageService, Theme, ThemeService } from 'shared-lib';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslateModule, NgClass],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnDestroy {
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private contactModalService = inject(ContactModalService);
  languageService = inject(LanguageService);

  private ticking = false;
  isScrolled = false;
  private destroy$ = new Subject<void>();

  currentTheme = computed(() => this.themeService.getCurrentTheme());
  isDarkTheme = computed(() => this.themeService.isDark());
  currentLogo = computed(() =>
    this.isDarkTheme()
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg'
  );

  currentLanguage = computed(() => this.languageService.currentLanguage());
  supportedLanguages = computed(() => this.languageService.availableLanguages);

  constructor() {
    effect(() => {
      this.isDarkTheme();
      this.currentTheme();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTheme(theme: Theme): void {
    window.scroll(0, 0);
    this.themeService.setTheme(theme);
    this.closeThemeDropdown();
  }

  isThemeActive(theme: Theme): boolean {
    return this.currentTheme() === theme;
  }

  getActiveThemeIcon(): string {
    const icons = { light: 'fi-sun', dark: 'fi-moon', auto: 'fi-monitor' };
    return icons[this.currentTheme()] || 'fi-sun';
  }

  getActiveThemeLabel(): string {
    const labels = { light: 'Light', dark: 'Dark', auto: 'Auto' };
    return labels[this.currentTheme()] || 'Light';
  }

  private closeThemeDropdown(): void {
    const el = document.querySelector('.theme-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (el) {
      try {
        (window as any).bootstrap?.Dropdown?.getInstance(el)?.hide();
      } catch {}
      el.blur();
    }
  }

  setLanguage(code: string): void {
    if (code && code !== this.currentLanguage()) {
      this.languageService.changeLanguage(code);
      window.scroll(0, 0);
      this.closeLanguageDropdown();
    }
  }

  isLanguageActive(code: string): boolean {
    return this.currentLanguage() === code;
  }

  getCurrentLanguageName(): string {
    return this.languageService.getLanguageName(this.currentLanguage());
  }

  private closeLanguageDropdown(): void {
    const el = document.querySelector('.language-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (el) {
      try {
        (window as any).bootstrap?.Dropdown?.getInstance(el)?.hide();
      } catch {}
      el.blur();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        this.isScrolled = scrollY > 50;
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  openContactModal(): void {
    this.closeMenu();
    this.contactModalService.openContactModal().subscribe();
  }

  closeMenu(): void {
    if (window.innerWidth < 992) {
      const offcanvas = document.getElementById('navbarNav');
      if (offcanvas) {
        offcanvas.querySelector('.btn-close')?.dispatchEvent(new Event('click'));
      }
    }
    this.closeAllDropdowns();
  }

  private closeAllDropdowns(): void {
    try {
      document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
        (window as any).bootstrap?.Dropdown?.getInstance(el)?.hide();
        (el as HTMLElement).blur();
      });
      document.querySelectorAll('.dropdown-menu.show').forEach(d => d.classList.remove('show'));
      document.querySelectorAll('[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));
    } catch {}
  }

  isSectionActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  isSectionActiveMany(routes: string[]): boolean {
    return routes.some(r => this.router.url.startsWith(r));
  }
}
