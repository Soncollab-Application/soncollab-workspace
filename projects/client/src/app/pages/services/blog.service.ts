import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable, map, catchError, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BlogArticle,
  BlogCategory,
  BlogTag,
  BlogResponse,
  SingleBlogResponse,
  BlogCategoriesResponse,
  BlogTagsResponse,
  ApiCategoryResponse,
  ApiTagResponse,
  ApiSearchResponse,
  ApiFeaturedResponse,
  ApiRecentContentResponse,
  RecentBlog
} from '../models/blog.model';
import {LanguageService} from 'shared-lib';
import {RecaptchaActionService} from './recaptcha-action.service';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly apiUrl = environment.api.fullUrl;

  private blogArticlesSubject = new BehaviorSubject<BlogArticle[]>([]);
  public blogArticles$ = this.blogArticlesSubject.asObservable();
  private currentCategorySubject = new BehaviorSubject<BlogCategory | null>(null);
  public currentCategory$ = this.currentCategorySubject.asObservable();
  private currentTagSubject = new BehaviorSubject<BlogTag | null>(null);
  public currentTag$ = this.currentTagSubject.asObservable();

  recaptchActionService = inject(RecaptchaActionService);

  constructor(
    private httpClient: HttpClient,
    private languageService: LanguageService
  ) {}

  public getAllArticles(page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    let parameters = new HttpParams()
      .set('locale', locale)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.httpClient.get<BlogResponse>(`${this.apiUrl}/blog-articles`, { params: parameters }).pipe(
      map(response => {
        if (response.data) {
          this.blogArticlesSubject.next(response.data);
        }
        return response;
      }),
      catchError(error => {
        return of(null);
      })
    );
  }

  public async trackArticleView(slug: string, type: 'blog'): Promise<void> {
    try {
      const token = await this.recaptchActionService.getBlogViewToken();
      const body = {
        recaptcha_token: token,
        data: {
          article_slug: slug,
          article_type: type
        }
      }

      this.httpClient.post(`${this.apiUrl}/article-views`, body).subscribe({
        error: (error) => console.warn('Failed to track view:', error)
      })
    }catch (e) {
      console.warn('reCAPTCHA failed for tracking view:', e);
    }

  }

  public getArticleBySlug(slug: string): Observable<BlogArticle | null> {
    const locale = this.languageService.getCurrentLanguage();
    const params = {
      locale
    };

    return this.httpClient.get<SingleBlogResponse>(`${this.apiUrl}/blog-articles/slug/${slug}`, { params }).pipe(
      map(response => response.data || null),
      catchError(error => {
        return of(null);
      })
    );
  }

  public getArticlesByCategory(categorySlug: string, page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<ApiCategoryResponse>(`${this.apiUrl}/blog-categories/slug/${categorySlug}`, { params: { locale } }).pipe(
      map(response => {
        if (!response?.data?.articles) {
          return null;
        }
        const categoryDetails = response.data;
        const totalArticles = categoryDetails.articles.length;
        const pageCount = Math.ceil(totalArticles / pageSize);
        const paginatedArticles = categoryDetails.articles.slice((page - 1) * pageSize, page * pageSize);

        const articles: BlogArticle[] = paginatedArticles.map(article => ({
          ...article,
          category: { id: categoryDetails.id, name: categoryDetails.name, slug: categoryDetails.slug },
          tags: []
        }));

        const pagination = { page: page, pageSize: pageSize, pageCount: pageCount, total: totalArticles };
        const blogResponse: BlogResponse = { data: articles, meta: { pagination } };

        this.blogArticlesSubject.next(articles);
        return blogResponse;
      }),
      catchError(error => {
        return of(null);
      })
    );
  }


  public getArticlesByTag(tagSlug: string, page: number = 1, pageSize: number = 12): Observable<BlogResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<ApiTagResponse>(`${this.apiUrl}/blog-tags/slug/${tagSlug}`, { params: { locale } }).pipe(
      map(response => {
        if (!response?.data?.articles) {
          return null;
        }
        const tagDetails = response.data;
        const totalArticles = tagDetails.articles.length;
        const pageCount = Math.ceil(totalArticles / pageSize);
        const paginatedArticles = tagDetails.articles.slice((page - 1) * pageSize, page * pageSize);

        const articles: BlogArticle[] = paginatedArticles.map(article => ({
          ...article,
          tags: [{ id: tagDetails.id, name: tagDetails.name, slug: tagDetails.slug }]
        }));

        const pagination = { page: page, pageSize: pageSize, pageCount: pageCount, total: totalArticles };
        const blogResponse: BlogResponse = { data: articles, meta: { pagination } };

        this.blogArticlesSubject.next(articles);
        return blogResponse;
      }),
      catchError(error => {
        return of(null);
      })
    );
  }

  public getCategories(): Observable<BlogCategory[]> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<BlogCategoriesResponse>(`${this.apiUrl}/blog-categories`, { params: { locale } }).pipe(
      map(response => response.data || []),
      catchError(error => {
        return of([]);
      })
    );
  }

  public getTags(): Observable<BlogTag[]> {
    const locale = this.languageService.getCurrentLanguage();
    return this.httpClient.get<BlogTagsResponse>(`${this.apiUrl}/blog-tags`, { params: { locale } }).pipe(
      map(response => response.data || []),
      catchError(error => {
        return of([]);
      })
    );
  }

  public searchArticles(query: string, limit: number = 10): Observable<ApiSearchResponse | null> {
    const locale = this.languageService.getCurrentLanguage();
    const parameters = new HttpParams().set('q', query).set('type', 'blog').set('limit', limit.toString()).set('locale', locale);
    return this.httpClient.get<ApiSearchResponse>(`${this.apiUrl}/content/search`, { params: parameters }).pipe(
      catchError(error => {
        return of(null);
      })
    );
  }

  public getFeaturedArticles(limit: number = 5): Observable<{ data: BlogArticle[] } | null> {
    const locale = this.languageService.getCurrentLanguage();
    const parameters = new HttpParams().set('locale', locale).set('limit', limit.toString());
    return this.httpClient.get<ApiFeaturedResponse>(`${this.apiUrl}/content/featured`, { params: parameters }).pipe(
      map(response => {
        if (!response?.data?.blog) {
          return null;
        }
        const articles: BlogArticle[] = response.data.blog.map(featuredArticle => ({
          ...featuredArticle,
          readTime: featuredArticle.reading_time,
          publishedAt: featuredArticle.publishedAt || '',
          isFeatured: true,
        }));
        return { data: articles };
      }),
      catchError(error => {
        return of(null);
      })
    );
  }

  public getRecentArticles(limit: number = 10): Observable<{ data: BlogArticle[] } | null> {
    const locale = this.languageService.getCurrentLanguage();
    const parameters = new HttpParams().set('type', 'blog').set('locale', locale).set('limit', limit.toString());
    return this.httpClient.get<ApiRecentContentResponse>(`${this.apiUrl}/content/recent`, { params: parameters }).pipe(
      map(response => {
        if (!response?.data) {
          return null;
        }
        const recentBlogItems = response.data.filter(
          (item): item is RecentBlog => item.type === 'blog'
        );
        const articles: BlogArticle[] = recentBlogItems.map(recentArticle => ({
          ...recentArticle,
          content: recentArticle.excerpt,
          isFeatured: false,
        }));
        return { data: articles };
      }),
      catchError(error => {
        return of(null);
      })
    );
  }


  public setCurrentCategory(category: BlogCategory | null): void {
    this.currentCategorySubject.next(category);
  }

  public setCurrentTag(tag: BlogTag | null): void {
    this.currentTagSubject.next(tag);
  }

  public calculateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
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

  public clearState(): void {
    this.blogArticlesSubject.next([]);
    this.currentCategorySubject.next(null);
    this.currentTagSubject.next(null);
  }
}
