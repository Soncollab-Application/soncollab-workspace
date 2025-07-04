import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import {environment} from '../../../environments/environment';
import {Hero, HeroData, HeroResponse} from '../models/hero.model';

@Injectable({
  providedIn: 'root'
})
export class PageService {

  private readonly apiUrl = environment.api.fullUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les données du hero selon la locale
   */
  getHero(): Observable<Hero  | null> {
    const locale = localStorage.getItem('lang') || 'en';

    return this.http.get<HeroResponse>(`${this.apiUrl}/hero`, {
      params: { locale }
    }).pipe(
      map((response: HeroResponse) => this.mapHeroData(response.data)),
      catchError((error) => {
        console.error('Erreur lors de la récupération du hero:', error);
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

}
