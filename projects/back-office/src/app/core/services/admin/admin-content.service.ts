import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BlogArticle,
  BlogArticleFilters,
  BlogArticleListResponse,
  AVAILABLE_LOCALES,
} from '../../models/content/blog-article.model';

import { ContentStatsResponse } from '../../models/content/content-stats.model';

@Injectable({ providedIn: 'root' })
export class AdminContentService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly CONTENT_ENDPOINTS = {
    blog_articles: `${this.API_URL}/blog-articles`,
    blog_article_by_id: (documentId: string) => `${this.API_URL}/blog-articles/${documentId}`,
    blog_article_submit: `${this.API_URL}/blog-articles/submit-review`,
    blog_article_review: `${this.API_URL}/blog-articles/review`,

    help_articles: `${this.API_URL}/help-articles`,
    help_article_by_id: (documentId: string) => `${this.API_URL}/help-articles/${documentId}`,
    help_article_submit: `${this.API_URL}/help-articles/submit-review`,
    help_article_review: `${this.API_URL}/help-articles/review`,

    blog_categories: `${this.API_URL}/blog-categories`,
    blog_category_by_id: (documentId: string) => `${this.API_URL}/blog-categories/${documentId}`,

    help_categories: `${this.API_URL}/help-categories`,
    help_category_by_id: (documentId: string) => `${this.API_URL}/help-categories/${documentId}`,

    blog_tags: `${this.API_URL}/blog-tags`,
    blog_tag_by_id: (documentId: string) => `${this.API_URL}/blog-tags/${documentId}`,

    validate_content: (contentType: string, documentId: string) =>
      `${this.API_URL}/content/validate/${contentType}/${documentId}`,
    my_content: `${this.API_URL}/content/my-content`,
    pending_reviews: `${this.API_URL}/content/pending-reviews`,
    content_stats: `${this.API_URL}/content/stats`,
    content_dashboard: `${this.API_URL}/content/dashboard`,
    bulk_approve: `${this.API_URL}/content/bulk-approve`,
  };


  getBlogArticles(
    page = 1,
    pageSize = 25,
    filters?: BlogArticleFilters,
    sortField?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    locale?: string // Ajout du paramètre locale
  ): Observable<BlogArticleListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField || 'createdAt'}:${sortOrder}`)
      .set('populate[0]', 'author')
      .set('populate[1]', 'category')
      .set('populate[2]', 'tags')
      .set('populate[3]', 'featured_image')
      .set('populate[4]', 'reviewed_by')
      .set('populate[5]', 'localizations'); // Populate les autres versions

    // IMPORTANT : Toujours filtrer par locale
    if (locale) {
      params = params.set('locale', locale);
    }

    if (filters?.search) {
      const searchTerms = filters.search.trim().split(/\s+/);
      if (searchTerms.length === 2) {
        params = params.set('filters[$or][0][$and][0][title][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][0][$and][1][title][$containsi]', searchTerms[1]);
        params = params.set('filters[$or][1][excerpt][$containsi]', filters.search);
      } else {
        params = params.set('filters[$or][0][title][$containsi]', filters.search);
        params = params.set('filters[$or][1][excerpt][$containsi]', filters.search);
      }
    }

    if (filters?.status) {
      params = params.set('filters[content_status][$eq]', filters.status);
    }

    if (filters?.author) {
      params = params.set('filters[author][documentId][$eq]', filters.author);
    }

    if (filters?.category) {
      params = params.set('filters[category][documentId][$eq]', filters.category);
    }

    if (filters?.is_featured !== undefined) {
      params = params.set('filters[is_featured][$eq]', filters.is_featured.toString());
    }

    if (filters?.date_from) {
      params = params.set('filters[createdAt][$gte]', filters.date_from);
    }

    if (filters?.date_to) {
      params = params.set('filters[createdAt][$lte]', filters.date_to);
    }

    return this.http.get<BlogArticleListResponse>(this.CONTENT_ENDPOINTS.blog_articles, { params });
  }

  getBlogArticleById(documentId: string, locale?: string): Observable<{ data: BlogArticle }> {
    let params = new HttpParams()
      .set('populate[0]', 'author')
      .set('populate[1]', 'category')
      .set('populate[2]', 'tags')
      .set('populate[3]', 'featured_image')
      .set('populate[4]', 'reviewed_by')
      .set('populate[5]', 'og_image')
      .set('populate[6]', 'localizations');

    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_article_by_id(documentId),
      { params }
    );
  }

  createBlogArticle(data: Partial<BlogArticle>): Observable<{ data: BlogArticle }> {
    return this.http.post<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_articles,
      { data }
    );
  }

  updateBlogArticle(documentId: string, data: Partial<BlogArticle>): Observable<{ data: BlogArticle }> {
    return this.http.put<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_article_by_id(documentId),
      { data }
    );
  }

  deleteBlogArticle(documentId: string): Observable<void> {
    return this.http.delete<void>(this.CONTENT_ENDPOINTS.blog_article_by_id(documentId));
  }

  submitBlogArticleForReview(documentId: string): Observable<{ data: BlogArticle }> {
    return this.http.post<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_article_submit,
      { documentId }
    );
  }

  reviewBlogArticle(
    documentId: string,
    action: 'approve' | 'reject',
    reviewNotes?: string
  ): Observable<{ data: BlogArticle }> {
    return this.http.post<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_article_review,
      { documentId, action, review_notes: reviewNotes }
    );
  }

  getContentStats(locale?: string): Observable<ContentStatsResponse> {
    let params = new HttpParams();
    if (locale) {
      params = params.set('locale', locale);
    }
    return this.http.get<ContentStatsResponse>(
      this.CONTENT_ENDPOINTS.content_stats,
      { params }
    );
  }

  getAvailableLocales() {
    return AVAILABLE_LOCALES;
  }
}
