import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  constructor() {
    this.setupThemeListener();
  }

  // 🎨 Thème : 'light' | 'dark' | 'auto'
  getStoredTheme(): string {
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'auto') {
      return theme;
    }
    // Sauvegarde par défaut si aucun thème trouvé
    this.setStoredTheme('light');
    return 'light';
  }

  setStoredTheme(theme: string): void {
    localStorage.setItem('theme', theme);
  }

  getPreferredTheme(): string {
    return this.getStoredTheme();
  }

  setTheme(theme: string): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme);
    }

    this.showActiveTheme(theme);
  }

  showActiveTheme(theme: string, focus: boolean = false): void {
    const themeSwitcher = document.querySelector('.theme-switcher');
    if (!themeSwitcher) return;

    const activeThemeIcon = document.querySelector('.theme-icon-active i');
    const btnToActive = document.querySelector(`[data-bs-theme-value="${theme}"]`);

    if (btnToActive && activeThemeIcon) {
      const iconOfActiveBtn = btnToActive.querySelector('.theme-icon i')?.className;

      document.querySelectorAll('[data-bs-theme-value]').forEach((el) => {
        el.classList.remove('active');
        el.setAttribute('aria-pressed', 'false');
      });

      btnToActive.classList.add('active');
      btnToActive.setAttribute('aria-pressed', 'true');
      if (iconOfActiveBtn) {
        activeThemeIcon.className = iconOfActiveBtn;
      }

      themeSwitcher.setAttribute('aria-label', `Toggle theme (${theme})`);
      if (focus) {
        (themeSwitcher as HTMLElement).focus();
      }
    }
  }

  setupThemeListener(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const theme = this.getStoredTheme();
      if (theme !== 'light' && theme !== 'dark') {
        this.setTheme(this.getPreferredTheme());
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      const theme = this.getPreferredTheme();
      this.setStoredTheme(theme); // 🟢 Ajout essentiel : stocker le thème au premier chargement
      this.setTheme(theme);

      document.querySelectorAll('[data-bs-theme-value]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const selectedTheme = toggle.getAttribute('data-bs-theme-value')!;
          this.setStoredTheme(selectedTheme);
          this.setTheme(selectedTheme);
        });
      });
    });
  }

  // ✅ Appliquer toutes les préférences (si besoin)
  applyPreferences(): void {
    this.setTheme(this.getPreferredTheme());
  }
}
