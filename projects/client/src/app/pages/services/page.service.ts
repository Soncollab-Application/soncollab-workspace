import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import {environment} from '../../../environments/environment';
import {Hero, HeroData, HeroResponse} from '../models/hero.model';
import {LanguageService} from 'shared-lib';

@Injectable({
  providedIn: 'root'
})
export class PageService {

  private readonly apiUrl = environment.api.fullUrl;

  constructor(
    private http: HttpClient,
    private languageService: LanguageService
  ) {}

  /**
   * Récupère les données du hero selon la langue actuelle
   */
  getHero(): Observable<Hero | null> {
    const locale = this.languageService.getCurrentLanguage();

    return this.http.get<HeroResponse>(`${this.apiUrl}/hero`, {
      params: { locale }
    }).pipe(
      map((response: HeroResponse) => this.mapHeroData(response.data)),
      catchError((error) => {
        console.error(`❌ Erreur lors de la récupération du hero en ${locale}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les données du hero pour une langue spécifique
   */
  getHeroForLanguage(language: string): Observable<Hero | null> {
    return this.http.get<HeroResponse>(`${this.apiUrl}/hero`, {
      params: { locale: language }
    }).pipe(
      map((response: HeroResponse) => this.mapHeroData(response.data)),
      catchError((error) => {
        console.error(`❌ Erreur lors de la récupération du hero pour ${language}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Mappe les données de l'API vers le modèle Hero
   */
  private mapHeroData(data: HeroData): Hero {
    return {
      id: data.id,
      documentId: data.documentId,
      title: data.title,
      subtitle: data.subtitle,
      actionBtn: data.action_btn,
      locale: data.locale
    };
  }

  /**
   * ✅ Pré-charge les données pour toutes les langues supportées (optionnel)
   */
  preloadHeroForAllLanguages(): void {
    const supportedLanguages = this.languageService.getSupportedLanguages();

    supportedLanguages.forEach(language => {
      this.getHeroForLanguage(language.code).subscribe({
        next: (hero) => {
          if (hero) {
            //console.log(`✅ Hero pré-chargé pour ${language.name}:`, hero.title);
          }
        },
        error: (error) => {
          console.warn(`⚠️ Impossible de pré-charger le hero pour ${language.name}:`, error);
        }
      });
    });
  }
}
