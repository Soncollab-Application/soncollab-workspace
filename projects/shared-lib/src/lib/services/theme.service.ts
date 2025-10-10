import { Injectable, Inject, PLATFORM_ID, signal, computed, effect } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'soncollab-theme';

  private readonly themeSignal = signal<Theme>('dark');

  readonly effectiveTheme = computed<'light' | 'dark'>(() => {
    const theme = this.themeSignal();

    if (theme === 'auto' && isPlatformBrowser(this.platformId)) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return theme === 'light' ? 'light' : 'dark';
  });

  readonly isDark = computed(() => this.effectiveTheme() === 'dark');

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeTheme();
    this.setupThemeEffect();
    this.listenToSystemPreferences();
  }

  private initializeTheme(): void {
    const savedTheme = this.getStoredTheme();
    this.themeSignal.set(savedTheme);
  }

  private setupThemeEffect(): void {
    effect(() => {
      const theme = this.effectiveTheme();
      this.applyThemeToDOM(theme);
    });
  }

  getStoredTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'dark';
    }

    const stored = localStorage.getItem(this.THEME_KEY) as Theme | null;

    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored;
    }

    return 'dark';
  }

  applyPreferences(): void {
    this.listenToSystemPreferences();
  }

  setTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    this.themeSignal.set(theme);
  }

  private applyThemeToDOM(theme: 'light' | 'dark'): void {
    const htmlElement = this.document.documentElement;
    const bodyElement = this.document.body;

    htmlElement.removeAttribute('data-bs-theme');
    bodyElement.removeAttribute('data-bs-theme');
    htmlElement.classList.remove('dark-theme', 'light-theme');
    bodyElement.classList.remove('dark-theme', 'light-theme');

    htmlElement.setAttribute('data-bs-theme', theme);
    htmlElement.classList.add(`${theme}-theme`);
  }

  getCurrentTheme(): Theme {
    return this.themeSignal();
  }

  toggleTheme(): void {
    const current = this.themeSignal();
    const next: Theme =
      current === 'light' ? 'dark' :
        current === 'dark'  ? 'light' : 'dark';
    this.setTheme(next);
  }

  private listenToSystemPreferences(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = () => {
      if (this.themeSignal() === 'auto') {
        this.themeSignal.set('auto');
      }
    };

    mediaQuery.addEventListener('change', handler);
  }
}
