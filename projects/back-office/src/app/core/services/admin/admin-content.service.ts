import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {catchError, forkJoin, map, Observable, of} from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BlogArticle,
  BlogArticleFilters,
  BlogArticleListResponse,
  AVAILABLE_LOCALES,
} from '../../models/content/blog-article.model';

import { ContentStatsResponse } from '../../models/content/content-stats.model';
import {BlogCategory, BlogCategoryFilters, BlogCategoryListResponse} from '../../models/content/blog-category.model';
import {HelpArticle, HelpArticleFilters, HelpArticleListResponse} from '../../models/content/help-article.model';
import {HelpCategory, HelpCategoryFilters, HelpCategoryListResponse} from '../../models/content/help-category.model';
import {BlogTag, BlogTagFilters, BlogTagListResponse} from '../../models/content/blog-tag.model';

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

    article_views_count: (type: string, slug: string) =>
      `${this.API_URL}/article-views/count/${type}/${slug}`,

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
    locale?: string
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
      .set('populate[5]', 'localizations')
      .set('status', 'draft');

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

  getBlogCategories(
    page = 1,
    pageSize = 25,
    filters?: BlogCategoryFilters,
    sortField = 'order',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Observable<BlogCategoryListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`)
      .set('populate[0]', 'articles')
      .set('populate[1]', 'localizations');

    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.is_featured !== undefined) {
      params = params.set('filters[is_featured][$eq]', filters.is_featured.toString());
    }

    if (filters?.search) {
      params = params.set('filters[name][$containsi]', filters.search);
    }

    return this.http.get<BlogCategoryListResponse>(
      this.CONTENT_ENDPOINTS.blog_categories,
      { params }
    );
  }

  getBlogArticleById(documentId: string, locale?: string): Observable<{ data: BlogArticle }> {
    let params = new HttpParams()
      .set('populate[0]', 'author')
      .set('populate[1]', 'category')
      .set('populate[2]', 'tags')
      .set('populate[3]', 'featured_image')
      .set('populate[4]', 'reviewed_by')
      .set('populate[5]', 'og_image')
      .set('populate[6]', 'localizations')
      .set('status', 'draft');

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

  updateBlogArticle(documentId: string, data: Partial<BlogArticle>, locale?: string): Observable<{ data: BlogArticle }> {
    let params = new HttpParams();

    const articleLocale = locale || data.locale || 'fr';
    params = params.set('locale', articleLocale);

    return this.http.put<{ data: BlogArticle }>(
      this.CONTENT_ENDPOINTS.blog_article_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteBlogArticle(documentId: string, locale?: string): Observable<void> {
    let params = new HttpParams();

    const articleLocale = locale || 'fr';
    params = params.set('locale', articleLocale);

    return this.http.delete<void>(
      this.CONTENT_ENDPOINTS.blog_article_by_id(documentId),
      { params }
    );
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


  uploadFileToEntry(
    file: File,
    refId: string,
    ref: string,
    field: string
  ): Observable<any> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('refId', refId);
    formData.append('ref', ref);
    formData.append('field', field);

    return this.http.post(`${this.API_URL}/upload`, formData);
  }

  unlinkFileFromEntry(
    fileId: number,
    refId: string,
    ref: string,
    field: string
  ): Observable<void> {
    const params = new HttpParams()
      .set('refId', refId)
      .set('ref', ref)
      .set('field', field);

    return this.http.delete<void>(
      `${this.API_URL}/upload/files/${fileId}`,
      { params }
    );
  }

  getAvailableLocales() {
    return AVAILABLE_LOCALES;
  }

  getArticleViewsCount(type: 'blog' | 'help', slug: string, locale?: string): Observable<{ count: number }> {
    let params = new HttpParams();
    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<{ count: number }>(
      this.CONTENT_ENDPOINTS.article_views_count(type, slug),
      { params }
    );
  }

  getMultipleArticlesViewsCounts(
    type: 'blog' | 'help',
    articles: { slug: string }[],
    locale?: string
  ): Observable<{ [slug: string]: number }> {
    if (!articles || articles.length === 0) {
      return of({});
    }

    const requests = articles.map(article =>
      this.getArticleViewsCount(type, article.slug, locale).pipe(
        map(response => ({ slug: article.slug, count: response.count })),
        catchError(() => of({ slug: article.slug, count: 0 }))
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        return results.reduce((acc, result) => {
          acc[result.slug] = result.count;
          return acc;
        }, {} as { [slug: string]: number });
      })
    );
  }

  getHelpArticles(
    page = 1,
    pageSize = 25,
    filters?: HelpArticleFilters,
    sortField?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    locale?: string
  ): Observable<HelpArticleListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField || 'createdAt'}:${sortOrder}`)
      .set('populate[0]', 'author')
      .set('populate[1]', 'category')
      .set('populate[2]', 'attachments')
      .set('populate[3]', 'reviewed_by')
      .set('populate[4]', 'localizations')
      .set('status', 'draft');

    if (locale) {
      params = params.set('locale', locale);
    }

    if (filters?.search) {
      params = params.set('filters[$or][0][title][$containsi]', filters.search);
      params = params.set('filters[$or][1][excerpt][$containsi]', filters.search);
    }

    if (filters?.content_status) {
      params = params.set('filters[content_status][$eq]', filters.content_status);
    }

    if (filters?.category) {
      params = params.set('filters[category][documentId][$eq]', filters.category);
    }

    if (filters?.difficulty) {
      params = params.set('filters[difficulty_level][$eq]', filters.difficulty);
    }

    if (filters?.is_featured !== undefined) {
      params = params.set('filters[is_featured][$eq]', filters.is_featured.toString());
    }

    return this.http.get<HelpArticleListResponse>(this.CONTENT_ENDPOINTS.help_articles, { params });
  }

  getHelpCategories(
    page = 1,
    pageSize = 100,
    filters?: HelpCategoryFilters,
    sortField = 'order',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Observable<HelpCategoryListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`)
      .set('populate[0]', 'articles')
      .set('populate[1]', 'localizations');

    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.parent_only) {
      params = params.set('filters[parent_category][$null]', 'true');
    }

    if (filters?.search) {
      params = params.set('filters[name][$containsi]', filters.search);
    }

    return this.http.get<HelpCategoryListResponse>(
      this.CONTENT_ENDPOINTS.help_categories,
      { params }
    );
  }

  getHelpArticleById(documentId: string, locale?: string): Observable<{ data: HelpArticle }> {
    let params = new HttpParams()
      .set('populate[0]', 'author')
      .set('populate[1]', 'category')
      .set('populate[2]', 'reviewed_by')
      .set('populate[3]', 'attachments')
      .set('populate[4]', 'related_articles')
      .set('populate[5]', 'localizations')
      .set('status', 'draft');

    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<{ data: HelpArticle }>(
      this.CONTENT_ENDPOINTS.help_article_by_id(documentId),
      { params }
    );
  }

  createHelpArticle(data: Partial<HelpArticle>): Observable<{ data: HelpArticle }> {
    return this.http.post<{ data: HelpArticle }>(
      this.CONTENT_ENDPOINTS.help_articles,
      { data }
    );
  }

  updateHelpArticle(documentId: string, data: Partial<HelpArticle>, locale?: string): Observable<{ data: HelpArticle }> {
    let params = new HttpParams();

    const articleLocale = locale || data.locale || 'fr';
    params = params.set('locale', articleLocale);

    return this.http.put<{ data: HelpArticle }>(
      this.CONTENT_ENDPOINTS.help_article_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteHelpArticle(documentId: string, locale?: string): Observable<void> {
    let params = new HttpParams();

    const articleLocale = locale || 'fr';
    params = params.set('locale', articleLocale);

    return this.http.delete<void>(
      this.CONTENT_ENDPOINTS.help_article_by_id(documentId),
      { params }
    );
  }

  submitHelpArticleForReview(documentId: string): Observable<{ data: HelpArticle }> {
    return this.http.post<{ data: HelpArticle }>(
      this.CONTENT_ENDPOINTS.help_article_submit,
      { documentId }
    );
  }

  reviewHelpArticle(
    documentId: string,
    action: 'approve' | 'reject',
    reviewNotes?: string
  ): Observable<{ data: HelpArticle }> {
    return this.http.post<{ data: HelpArticle }>(
      this.CONTENT_ENDPOINTS.help_article_review,
      { documentId, action, review_notes: reviewNotes }
    );
  }

  // ========== BLOG CATEGORIES ==========
  createBlogCategory(data: Partial<any>): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(
      this.CONTENT_ENDPOINTS.blog_categories,
      { data }
    );
  }

  updateBlogCategory(documentId: string, data: Partial<BlogCategory>, locale?: string): Observable<{ data: any }> {
    let params = new HttpParams();

    const categoryLocale = locale || data.locale || 'fr';
    params = params.set('locale', categoryLocale);

    return this.http.put<{ data: any }>(
      this.CONTENT_ENDPOINTS.blog_category_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteBlogCategory(documentId: string, locale?: string): Observable<void> {
    let params = new HttpParams();

    const categoryLocale = locale || 'fr';
    params = params.set('locale', categoryLocale);

    return this.http.delete<void>(
      this.CONTENT_ENDPOINTS.blog_category_by_id(documentId),
      { params }
    );
  }

// ========== HELP CATEGORIES ==========
  createHelpCategory(data: Partial<any>): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(
      this.CONTENT_ENDPOINTS.help_categories,
      { data }
    );
  }

  updateHelpCategory(documentId: string, data: Partial<HelpCategory>, locale?: string): Observable<{ data: any }> {
    let params = new HttpParams();

    const categoryLocale = locale || data.locale || 'fr';
    params = params.set('locale', categoryLocale);

    return this.http.put<{ data: any }>(
      this.CONTENT_ENDPOINTS.help_category_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteHelpCategory(documentId: string, locale?: string): Observable<void> {
    let params = new HttpParams();

    const categoryLocale = locale || 'fr';
    params = params.set('locale', categoryLocale);

    return this.http.delete<void>(
      this.CONTENT_ENDPOINTS.help_category_by_id(documentId),
      { params }
    );
  }

// ========== BLOG TAGS ==========
  getBlogTags(
    page = 1,
    pageSize = 100,
    filters?: BlogTagFilters
  ): Observable<BlogTagListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', 'name:asc')
      .set('populate[0]', 'articles')
      .set('populate[1]', 'localizations');

    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.search) {
      params = params.set('filters[name][$containsi]', filters.search);
    }

    return this.http.get<BlogTagListResponse>(
      this.CONTENT_ENDPOINTS.blog_tags,
      { params }
    );
  }

  createBlogTag(data: Partial<BlogTag>): Observable<{ data: BlogTag }> {
    return this.http.post<{ data: BlogTag }>(
      this.CONTENT_ENDPOINTS.blog_tags,
      { data }
    );
  }

  updateBlogTag(documentId: string, data: Partial<BlogTag>, locale?: string): Observable<{ data: BlogTag }> {
    let params = new HttpParams();

    const tagLocale = locale || data.locale || 'fr';
    params = params.set('locale', tagLocale);

    return this.http.put<{ data: BlogTag }>(
      this.CONTENT_ENDPOINTS.blog_tag_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteBlogTag(documentId: string, locale?: string): Observable<void> {
    let params = new HttpParams();

    const tagLocale = locale || 'fr';
    params = params.set('locale', tagLocale);

    return this.http.delete<void>(
      this.CONTENT_ENDPOINTS.blog_tag_by_id(documentId),
      { params }
    );
  }
}
