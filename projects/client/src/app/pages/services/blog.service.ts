import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import {
  BlogArticle,
  BlogCategory,
  BlogTag,
  BlogResponse,
  SingleBlogResponse,
  BlogCategoriesResponse,
  BlogTagsResponse,
  SearchResult,
  FeaturedContent,
  RecentContent
} from '../models/blog.model';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly apiUrl = environment.api.fullUrl;

  // State management for blog data
  private blogArticlesSubject = new BehaviorSubject<BlogArticle[]>([]);
  private currentCategorySubject = new BehaviorSubject<BlogCategory | null>(null);
  private currentTagSubject = new BehaviorSubject<BlogTag | null>(null);

  // Public observables
  public blogArticles$ = this.blogArticlesSubject.asObservable();
  public currentCategory$ = this.currentCategorySubject.asObservable();
  public currentTag$ = this.currentTagSubject.asObservable();

  constructor(
    private http: HttpClient,
    private languageService: LanguageService
  ) {}

  /**
   * Récupère tous les articles de blog publiés
   */
  getAllArticles(page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('locale', locale)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<BlogResponse>(`${this.apiUrl}/blog-articles`, { params }).pipe(
      map((response: BlogResponse) => {
        if (response.data) {
          this.blogArticlesSubject.next(response.data);
          return response;
        }
        return null;
      }),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des articles de blog (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère un article de blog par slug
   */
  getArticleBySlug(slug: string): Observable<BlogArticle | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams().set('locale', locale);

    return this.http.get<SingleBlogResponse>(`${this.apiUrl}/blog-articles/slug/${slug}`, { params }).pipe(
      map((response: SingleBlogResponse) => response.data || null),
      catchError((error) => {
        console.error(`Erreur lors de la récupération de l'article ${slug} (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les articles d'une catégorie
   */
  getArticlesByCategory(categorySlug: string, page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('locale', locale)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<BlogResponse>(`${this.apiUrl}/blog-categories/slug/${categorySlug}`, { params }).pipe(
      map((response: BlogResponse) => {
        if (response.data) {
          this.blogArticlesSubject.next(response.data);
          return response;
        }
        return null;
      }),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des articles de la catégorie ${categorySlug} (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les articles d'un tag
   */
  getArticlesByTag(tagSlug: string, page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('locale', locale)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<BlogResponse>(`${this.apiUrl}/blog-tags/slug/${tagSlug}`, { params }).pipe(
      map((response: BlogResponse) => {
        if (response.data) {
          this.blogArticlesSubject.next(response.data);
          return response;
        }
        return null;
      }),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des articles du tag ${tagSlug} (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère toutes les catégories de blog
   */
  getCategories(): Observable<BlogCategory[]> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams().set('locale', locale);

    return this.http.get<BlogCategoriesResponse>(`${this.apiUrl}/blog-categories`, { params }).pipe(
      map((response: BlogCategoriesResponse) => response.data || []),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des catégories de blog (${locale}):`, error);
        return of([]);
      })
    );
  }

  /**
   * Récupère tous les tags de blog
   */
  getTags(): Observable<BlogTag[]> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams().set('locale', locale);

    return this.http.get<BlogTagsResponse>(`${this.apiUrl}/blog-tags`, { params }).pipe(
      map((response: BlogTagsResponse) => response.data || []),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des tags de blog (${locale}):`, error);
        return of([]);
      })
    );
  }

  /**
   * Recherche globale dans le blog
   */
  searchArticles(query: string, limit: number = 10): Observable<SearchResult | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('q', query)
      .set('type', 'blog')
      .set('limit', limit.toString())
      .set('locale', locale);

    return this.http.get<SearchResult>(`${this.apiUrl}/content/search`, { params }).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la recherche d'articles (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les articles mis en avant
   */
  getFeaturedArticles(limit: number = 5): Observable<FeaturedContent | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('type', 'blog')
      .set('locale', locale)
      .set('limit', limit.toString());

    return this.http.get<FeaturedContent>(`${this.apiUrl}/content/featured`, { params }).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la récupération des articles en avant (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les articles récents
   */
  getRecentArticles(limit: number = 10): Observable<RecentContent | null> {
    const locale = this.languageService.getCurrentLanguage();

    let params = new HttpParams()
      .set('type', 'blog')
      .set('locale', locale)
      .set('limit', limit.toString());

    return this.http.get<RecentContent>(`${this.apiUrl}/content/recent`, { params }).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la récupération des articles récents (${locale}):`, error);
        return of(null);
      })
    );
  }

  /**
   * Met à jour la catégorie actuelle
   */
  setCurrentCategory(category: BlogCategory | null): void {
    this.currentCategorySubject.next(category);
  }

  /**
   * Met à jour le tag actuel
   */
  setCurrentTag(tag: BlogTag | null): void {
    this.currentTagSubject.next(tag);
  }

  /**
   * Calcule le temps de lecture estimé (basé sur ~200 mots par minute)
   */
  calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Formate la date de publication
   */
  formatPublishedDate(publishedAt: string, locale?: string): string {
    const currentLocale = locale || this.languageService.getCurrentLanguage();
    const date = new Date(publishedAt);

    return date.toLocaleDateString(currentLocale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Nettoie le state (utile lors des changements de route)
   */
  clearState(): void {
    this.blogArticlesSubject.next([]);
    this.currentCategorySubject.next(null);
    this.currentTagSubject.next(null);
  }

  /**
   * Pré-charge les données pour une langue spécifique
   */
  preloadDataForLanguage(language: string): void {
    // Pré-chargement des catégories
    this.http.get<BlogCategoriesResponse>(`${this.apiUrl}/blog-categories`, {
      params: { locale: language }
    }).subscribe({
      next: () => {},
      error: (error) => console.warn(`Impossible de pré-charger les catégories pour ${language}:`, error)
    });

    // Pré-chargement des articles récents
    this.http.get<RecentContent>(`${this.apiUrl}/content/recent`, {
      params: { type: 'blog', locale: language, limit: '5' }
    }).subscribe({
      next: () => {},
      error: (error) => console.warn(`Impossible de pré-charger les articles récents pour ${language}:`, error)
    });
  }
}
