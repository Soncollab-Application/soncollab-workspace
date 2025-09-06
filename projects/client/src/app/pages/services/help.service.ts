import {inject, Injectable} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import {
  HelpArticle,
  HelpCategory,
  HelpResponse,
  SingleHelpResponse,
  HelpCategoriesResponse,
  ApiHelpCategoryResponse,
  ApiHelpSearchResponse,
  ApiHelpFeaturedResponse,
  ApiHelpRecentContentResponse,
  RecentHelp
} from '../models/help.model';
import {RecaptchaService} from '../../core/services/recaptcha.service';

@Injectable({
  providedIn: 'root'
})
export class HelpService {
  private readonly apiUrl = environment.api.fullUrl;

  private helpArticlesSubject = new BehaviorSubject<HelpArticle[]>([]);
  public helpArticles$ = this.helpArticlesSubject.asObservable();
  private currentCategorySubject = new BehaviorSubject<HelpCategory | null>(null);
  public currentCategory$ = this.currentCategorySubject.asObservable();

  recaptchaService = inject(RecaptchaService);

  constructor(
    private httpClient: HttpClient,
    private languageService: LanguageService
  ) {}

  public getAllArticles(page: number = 1, pageSize: number = 12): Observable<HelpResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('locale', locale)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.httpClient.get<HelpResponse>(`${this.apiUrl}/help-articles`, { params: parameters }).pipe(
      map(response => {
        if (response.data) {
          this.helpArticlesSubject.next(response.data);
        }
        return response;
      }),
      catchError(error => {
        console.error(`Erreur lors de la récupération des articles d'aide (${locale}):`, error);
        return of(null);
      })
    );
  }

  public getArticleBySlug(slug: string, incrementView: boolean = true): Observable<HelpArticle | null> {
    const locale = this.languageService.getCurrentLanguage();
    const params = {
      locale,
      increment_view: incrementView.toString()
    };

    return this.httpClient.get<SingleHelpResponse>(`${this.apiUrl}/help-articles/slug/${slug}`, { params }).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error(`Erreur lors de la récupération de l'article d'aide ${slug} (${locale}):`, error);
        return of(null);
      })
    );
  }
  public getArticlesByCategory(categorySlug: string, page: number = 1, pageSize: number = 12): Observable<HelpResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<ApiHelpCategoryResponse>(`${this.apiUrl}/help-categories/slug/${categorySlug}`, { params: { locale } }).pipe(
      map(response => {
        if (!response?.data?.articles) {
          return null;
        }
        const categoryDetails = response.data;
        const totalArticles = categoryDetails.articles.length;
        const pageCount = Math.ceil(totalArticles / pageSize);
        const paginatedArticles = categoryDetails.articles.slice((page - 1) * pageSize, page * pageSize);

        const articles: HelpArticle[] = paginatedArticles.map(article => ({
          ...article,
          category: { id: categoryDetails.id, name: categoryDetails.name, slug: categoryDetails.slug }
        }));

        const pagination = { page: page, pageSize: pageSize, pageCount: pageCount, total: totalArticles };
        const helpResponse: HelpResponse = { data: articles, meta: { pagination } };

        this.helpArticlesSubject.next(articles);
        return helpResponse;
      }),
      catchError(error => {
        console.error(`Erreur lors de la récupération des articles de la catégorie d'aide ${categorySlug} (${locale}):`, error);
        return of(null);
      })
    );
  }

  public getCategories(): Observable<HelpCategory[]> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<HelpCategoriesResponse>(`${this.apiUrl}/help-categories`, { params: { locale } }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error(`Erreur lors de la récupération des catégories d'aide (${locale}):`, error);
        return of([]);
      })
    );
  }

  public searchArticles(query: string, limit: number = 20): Observable<ApiHelpSearchResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('q', query)
      .set('type', 'help')
      .set('limit', limit.toString())
      .set('locale', locale);
    return this.httpClient.get<ApiHelpSearchResponse>(`${this.apiUrl}/content/search`, { params: parameters }).pipe(
      map(response => response || null),
      catchError(error => {
        console.error(`Erreur lors de la recherche d'articles d'aide avec "${query}" (${locale}):`, error);
        return of(null);
      })
    );
  }


  public getPopularSearches(limit: number = 5): Observable<string[]> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('limit', limit.toString())
      .set('locale', locale);
    return this.httpClient.get<{ data: string[] }>(`${this.apiUrl}/content/popular-searches`, { params: parameters }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error(`Erreur lors de la récupération des recherches populaires (${locale}):`, error);
        return of([]);
      })
    );
  }

  public getFeaturedArticles(limit: number = 6): Observable<ApiHelpFeaturedResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('limit', limit.toString())
      .set('locale', locale);
    return this.httpClient.get<ApiHelpFeaturedResponse>(`${this.apiUrl}/content/featured`, { params: parameters }).pipe(
      map(response => response || null),
      catchError(error => {
        console.error(`Erreur lors de la récupération des articles d'aide en vedette (${locale}):`, error);
        return of(null);
      })
    );
  }

  public getRecentArticles(limit: number = 10): Observable<ApiHelpRecentContentResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('limit', limit.toString())
      .set('type', 'help')
      .set('locale', locale);
    return this.httpClient.get<ApiHelpRecentContentResponse>(`${this.apiUrl}/content/recent`, { params: parameters }).pipe(
      map(response => response || null),
      catchError(error => {
        console.error(`Erreur lors de la récupération des articles d'aide récents (${locale}):`, error);
        return of(null);
      })
    );
  }


  public async rateArticle(documentId: string, rating: number, feedback?: string): Promise<void> {
    if (!documentId) return;

    try {
      const token = await this.recaptchaService.getRatingToken();
      const locale = this.languageService.getCurrentLanguage();

      const body = {
        rating,
        recaptcha_token: token,
        ...(feedback && { feedback })
      };

      this.httpClient.post(`${this.apiUrl}/help-articles/${documentId}/rate`, body, {
        params: { locale }
      }).subscribe({
        error: (error) => console.warn('Failed to rate article:', error)
      });
    } catch (error) {
      console.warn('reCAPTCHA failed for rating:', error);
    }
  }

  /**
   * Calcule le temps de lecture estimé d'un contenu
   */
  public calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, readTime);
  }

  /**
   * Met à jour les sujets observables
   */
  public updateCurrentCategory(category: HelpCategory | null): void {
    this.currentCategorySubject.next(category);
  }

  /**
   * Obtient la catégorie actuelle
   */
  public getCurrentCategory(): HelpCategory | null {
    return this.currentCategorySubject.value;
  }

  /**
   * Filtrage des articles par niveau de difficulté
   */
  public getArticlesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced', page: number = 1, pageSize: number = 12): Observable<HelpResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('locale', locale)
      .set('difficulty_level', difficulty)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.httpClient.get<HelpResponse>(`${this.apiUrl}/help-articles`, { params: parameters }).pipe(
      map(response => {
        if (response.data) {
          this.helpArticlesSubject.next(response.data);
        }
        return response;
      }),
      catchError(error => {
        return of(null);
      })
    );
  }

  /**
   * Obtient les articles les mieux notés
   */
  public getTopRatedArticles(limit: number = 10): Observable<HelpResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('locale', locale)
      .set('sort', 'helpfulness_score:desc')
      .set('limit', limit.toString());
    return this.httpClient.get<HelpResponse>(`${this.apiUrl}/help-articles`, { params: parameters }).pipe(
      catchError(error => {
        return of(null);
      })
    );
  }


  public formatPublishedDate(publishedAt: string, locale?: string): string {
    const currentLocale = locale || this.languageService.getCurrentLanguage();
    const date = new Date(publishedAt);
    return date.toLocaleDateString(currentLocale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
