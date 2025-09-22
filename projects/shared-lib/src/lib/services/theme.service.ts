import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'soncollab-theme';
  private themeSubject = new BehaviorSubject<Theme>('light');
  public theme$ = this.themeSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.initializeTheme();
  }

  /**
   * Initialise le thème au démarrage de l'application
   */
  private initializeTheme(): void {
    const savedTheme = this.getStoredTheme();
    this.applyTheme(savedTheme);
  }

  /**
   * Récupère le thème stocké ou détecte la préférence système
   */
  getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY) as Theme;

    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      return stored;
    }

    // Détection automatique si pas de préférence stockée
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Applique le thème et met à jour le DOM
   */
  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.themeSubject.next(theme);
  }

  /**
   * Applique physiquement le thème au DOM
   */
  private applyTheme(theme: Theme): void {
    const htmlElement = this.document.documentElement;
    const bodyElement = this.document.body;

    // Supprime tous les attributs de thème existants
    htmlElement.removeAttribute('data-bs-theme');
    bodyElement.removeAttribute('data-bs-theme');

    // Supprime les classes de thème si elles existent
    htmlElement.classList.remove('dark-theme', 'light-theme');
    bodyElement.classList.remove('dark-theme', 'light-theme');

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'auto') {
      // Détecte automatiquement selon la préférence système
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = theme;
    }

    // Applique l'attribut data-bs-theme sur l'élément HTML
    htmlElement.setAttribute('data-bs-theme', effectiveTheme);

    // Optionnel : ajoute aussi une classe pour la compatibilité
    htmlElement.classList.add(`${effectiveTheme}-theme`);
  }

  /**
   * Récupère le thème actuel
   */
  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Bascule entre light et dark
   */
  toggleTheme(): void {
    const currentTheme = this.getCurrentTheme();
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Vérifie si le thème sombre est actif
   */
  isDarkTheme(): boolean {
    const htmlElement = this.document.documentElement;
    return htmlElement.getAttribute('data-bs-theme') === 'dark';
  }

  /**
   * Applique les préférences utilisateur (appelé au démarrage)
   */
  applyPreferences(): void {
    // Écoute les changements de préférence système pour le mode auto
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', (e) => {
        const currentTheme = this.getCurrentTheme();
        if (currentTheme === 'auto') {
          this.applyTheme('auto'); // Réapplique le thème auto
        }
      });
    }
  }

}
