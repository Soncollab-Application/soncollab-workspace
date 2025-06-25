import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  constructor() {
    this.setupThemeListener();
  }

  // 🎨 Forcer uniquement le thème dark
  getStoredTheme(): string {
    return 'dark'; // Toujours retourner 'dark'
  }

  setStoredTheme(theme: string): void {
    // Ne rien stocker, toujours forcer dark
    localStorage.setItem('theme', 'dark');
  }

  getPreferredTheme(): string {
    return 'dark'; // Toujours retourner 'dark'
  }

  setTheme(theme: string): void {
    // Ignorer le paramètre theme et toujours appliquer dark
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    this.showActiveTheme('dark');
  }

  showActiveTheme(theme: string, focus: boolean = false): void {
    // Forcer theme à 'dark'
    const forcedTheme = 'dark';

    const themeSwitcher = document.querySelector('.theme-switcher');
    if (!themeSwitcher) return;

    const activeThemeIcon = document.querySelector('.theme-icon-active i');
    const btnToActive = document.querySelector(`[data-bs-theme-value="${forcedTheme}"]`);

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

      themeSwitcher.setAttribute('aria-label', `Toggle theme (${forcedTheme})`);
      if (focus) {
        (themeSwitcher as HTMLElement).focus();
      }
    }
  }

  setupThemeListener(): void {
    // Supprimer l'écoute des préférences système
    // window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    //   // Plus besoin d'écouter les changements
    // });

    window.addEventListener('DOMContentLoaded', () => {
      // Toujours forcer dark
      this.setStoredTheme('dark');
      this.setTheme('dark');

      document.querySelectorAll('[data-bs-theme-value]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          // Ignorer le clic et toujours appliquer dark
          this.setStoredTheme('dark');
          this.setTheme('dark');
        });
      });
    });
  }

  // ✅ Appliquer uniquement le thème dark
  applyPreferences(): void {
    this.setTheme('dark');
  }
}
