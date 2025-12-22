import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {AVAILABLE_LANGUAGES, Language} from '../models';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly currentLanguage = signal<string>('fr');
  readonly isInitialized = signal<boolean>(false); // AJOUTER CECI
  readonly availableLanguages: Language[] = AVAILABLE_LANGUAGES;
  private isInitializing = false;

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    if (this.isInitializing) return;
    this.isInitializing = true;

    let savedLang = localStorage.getItem('lang');

    if (!savedLang) {
      const browserLang = navigator.language?.split('-')[0] || 'fr';
      savedLang = this.availableLanguages.some(l => l.code === browserLang)
        ? browserLang
        : 'fr';
    }

    this.translate.addLangs(this.availableLanguages.map(l => l.code));
    this.translate.setDefaultLang(savedLang);
    this.translate.use(savedLang).subscribe(() => {
      this.currentLanguage.set(savedLang!);
      localStorage.setItem('lang', savedLang!);
      document.documentElement.lang = savedLang!;
      this.isInitialized.set(true);
      this.preloadOtherLanguages(savedLang!);
    });
  }

  private preloadOtherLanguages(currentLang: string): void {
    const otherLangs = this.availableLanguages
      .map(l => l.code)
      .filter(code => code !== currentLang);

    if (otherLangs.length === 0) return;

    setTimeout(() => {
      otherLangs.forEach(lang => {
        this.translate.getTranslation(lang).subscribe();
      });
    }, 500);
  }

  changeLanguage(code: string): void {
    if (!this.availableLanguages.some(l => l.code === code)) {
      code = 'fr';
    }

    if (this.currentLanguage() === code) {
      return;
    }

    this.translate.use(code).subscribe({
      next: () => {
        this.currentLanguage.set(code);
        localStorage.setItem('lang', code);
        document.documentElement.lang = code;
      },
      error: (err) => {
        console.error(`Erreur changement de langue vers ${code}:`, err);
      }
    });
  }

  getSupportedLanguages(): Language[] {
    return this.availableLanguages;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage();
  }

  getLanguageName(code: string): string {
    const lang = this.availableLanguages.find(l => l.code === code);
    return lang?.name || code.toUpperCase();
  }
}
