import { Injectable } from '@angular/core';
import { TranslateService} from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {Language} from '../models/language.model';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  // ✅ Langues supportées
  private readonly supportedLanguages: Language[] = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' }
  ];

  // ✅ BehaviorSubject pour la langue actuelle
  private currentLanguageSubject = new BehaviorSubject<string>('fr');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  // ✅ BehaviorSubject pour détecter les changements
  private languageChangedSubject = new BehaviorSubject<string>('fr');
  public languageChanged$ = this.languageChangedSubject.asObservable();

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  /**
   * Initialise la langue au démarrage de l'application
   */
  private initializeLanguage(): void {
    let savedLang = localStorage.getItem('lang');

    if (!savedLang) {
      // Détection automatique de la langue du navigateur
      const browserLang = navigator.language?.split('-')[0] || 'fr';
      savedLang = this.supportedLanguages.some(lang => lang.code === browserLang) ? browserLang : 'fr';
      this.saveLanguage(savedLang);
    }

    this.setLanguage(savedLang, false); // false = ne pas émettre d'événement de changement
  }

  /**
   * Change la langue actuelle
   */
  setLanguage(langCode: string, emitChange: boolean = true): void {
    if (!this.isLanguageSupported(langCode)) {
      langCode = 'fr';
    }

    // Configurer ngx-translate
    this.translate.setDefaultLang('fr');
    this.translate.use(langCode);

    // Sauvegarder dans localStorage
    this.saveLanguage(langCode);

    // Mettre à jour les BehaviorSubjects
    this.currentLanguageSubject.next(langCode);

    if (emitChange) {
      this.languageChangedSubject.next(langCode);
    }
  }

  /**
   * Obtient la langue actuelle
   */
  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  /**
   * Obtient le nom de la langue actuelle
   */
  getCurrentLanguageName(): string {
    return this.getLanguageName(this.getCurrentLanguage());
  }

  /**
   * Obtient le nom d'une langue par son code
   */
  getLanguageName(langCode: string): string {
    const language = this.supportedLanguages.find(lang => lang.code === langCode);
    return language?.name || langCode.toUpperCase();
  }

  /**
   * Obtient toutes les langues supportées
   */
  getSupportedLanguages(): Language[] {
    return [...this.supportedLanguages];
  }

  /**
   * Vérifie si une langue est supportée
   */
  isLanguageSupported(langCode: string): boolean {
    return this.supportedLanguages.some(lang => lang.code === langCode);
  }

  /**
   * Sauvegarde la langue dans localStorage
   */
  private saveLanguage(langCode: string): void {
    try {
      localStorage.setItem('lang', langCode);
    } catch (error) {
      console.warn('Impossible de sauvegarder la langue dans localStorage:', error);
    }
  }

  /**
   * Observable pour écouter les changements de langue
   */
  onLanguageChange(): Observable<string> {
    return this.languageChanged$;
  }

  /**
   * Force un rafraîchissement des données dépendantes de la langue
   */
  refreshLanguageDependentData(): void {
    this.languageChangedSubject.next(this.getCurrentLanguage());
  }
}
