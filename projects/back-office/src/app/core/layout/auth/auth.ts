import { Component, inject, computed, OnDestroy } from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import { Subject } from 'rxjs';
import { LanguageService, ThemeService, Theme } from 'shared-lib';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, CommonModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthLayout implements OnDestroy {
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();

  currentYear = new Date().getFullYear();

  currentTheme = computed(() => this.themeService.getCurrentTheme());
  isDarkTheme = computed(() => this.themeService.isDark());
  currentLogo = computed(() =>
    this.isDarkTheme()
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg'
  );

  currentLanguage = computed(() => this.languageService.currentLanguage());
  supportedLanguages = computed(() => this.languageService.availableLanguages);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setLanguage(languageCode: string): void {
    if (languageCode && languageCode !== this.currentLanguage()) {
      this.languageService.changeLanguage(languageCode);
    }
  }

  isLanguageActive(code: string): boolean {
    return this.currentLanguage() === code;
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  isThemeActive(theme: Theme): boolean {
    return this.currentTheme() === theme;
  }

  getActiveThemeIcon(): string {
    const icons = { light: 'fi-sun', dark: 'fi-moon', auto: 'fi-monitor' };
    return icons[this.currentTheme()] || 'fi-sun';
  }

  protected readonly environment = environment;
}
