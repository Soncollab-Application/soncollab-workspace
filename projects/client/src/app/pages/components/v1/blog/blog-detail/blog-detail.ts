import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {BlogArticle} from '../../../../models/blog.model';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Meta, Title} from '@angular/platform-browser';
import {LanguageService} from '../../../../../core/services/language.service';
import {BlogService} from '../../../../services/blog.service';
import {TranslatePipe} from '@ngx-translate/core';
import {SeoService} from '../../../../../core/services/seo.service';

@Component({
  selector: 'app-blog-detail',
  imports: [
    TranslatePipe,
    RouterLink
  ],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.css'
})
export class BlogDetail implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // State
  article: BlogArticle | null = null;
  relatedArticles: BlogArticle[] = [];
  isLoading = false;
  notFound = false;
  slug = '';

  constructor(
    private blogService: BlogService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService,
    private meta: Meta,
    private title: Title
  ) {}

  ngOnInit(): void {
    this.setupRouteListener();
    this.setupLanguageListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouteListener(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.slug = params['slug'];
        if (this.slug) {
          this.loadArticle();
        }
      });
  }

  private setupLanguageListener(): void {
    this.languageService.languageChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.slug) {
          this.loadArticle();
        }
      });
  }

  private loadArticle(): void {
    this.isLoading = true;
    this.notFound = false;
    this.article = null;

    this.blogService.getArticleBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe(article => {
        this.isLoading = false;

        if (article) {
          this.article = {
            ...article,
            readTime: article.readTime || this.blogService.calculateReadTime(article.content)
          };

          this.seoService.updateBlogArticleSEO(article);
          this.loadRelatedArticles();
        } else {
          this.notFound = true;
        }
      });
  }

  private loadRelatedArticles(): void {
    if (!this.article) return;

    const handleResponse = (response: any) => {
      const articles = response.data;

      // On vérifie si 'articles' est bien un tableau avant de filtrer
      if (Array.isArray(articles)) {
        // On filtre l'article actuel de la liste des articles liés
        this.relatedArticles = articles.filter(a => a.id !== this.article!.id);
      }
    };

    if (this.article.category) {
      // Charger les articles de la même catégorie
      this.blogService.getArticlesByCategory(this.article.category.slug, 1, 6)
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          if (response) {
            handleResponse(response);
          }
        });
    } else {
      // Charger les articles récents
      this.blogService.getRecentArticles(6)
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          if (response) {
            handleResponse(response);
          }
        });
    }
  }

  sanitizeContent(content: string): string {
    // Basic HTML sanitization - in a real app, use a proper sanitization library like DOMPurify
    return content;
  }

  shareOnTwitter(): void {
    if (!this.article) return;

    const text = `${this.article.title} - ${window.location.href}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  shareOnLinkedIn(): void {
    if (!this.article) return;

    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
      console.log('Link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }

  goBack(): void {
    window.history.back();
  }

  formatDate(date: string): string {
    return this.blogService.formatPublishedDate(date);
  }

}
