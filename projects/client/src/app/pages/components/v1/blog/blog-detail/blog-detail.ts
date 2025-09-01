import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { BlogArticle } from '../../../../models/blog.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../../../core/services/language.service';
import { BlogService } from '../../../../services/blog.service';
import { SeoService } from '../../../../../core/services/seo.service';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {environment} from '../../../../../../environments/environment';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.html',
  imports: [
    CommonModule,
    TranslatePipe,
    RouterLink,
    MarkdownComponent
  ],
  standalone: true,
  styleUrls: ['./blog-detail.css']
})
export class BlogDetail implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  public article: BlogArticle | null = null;
  public relatedArticles: BlogArticle[] = [];
  public isLoading = false;
  public notFound = false;
  private slug = '';

  constructor(
    private blogService: BlogService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService
  ) {}

  public ngOnInit(): void {
    this.setupRouteListener();
    this.setupLanguageListener();
  }

  public ngOnDestroy(): void {
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
            readTime: article.reading_time || this.blogService.calculateReadTime(article.content || article.excerpt || '')
          };

          this.seoService.updateBlogArticleSEO(article);
          this.loadRelatedArticles();
        } else {
          this.notFound = true;
        }
      });
  }

  private loadRelatedArticles(): void {
    if (!this.article?.category) {
      this.blogService.getRecentArticles(4).pipe(takeUntil(this.destroy$)).subscribe(response => {
        if (response?.data) {
          this.relatedArticles = response.data.filter(a => a.id !== this.article?.id).slice(0, 3);
        }
      });
      return;
    }

    this.blogService.getArticlesByCategory(this.article.category.slug, 1, 4).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response?.data) {
        this.relatedArticles = response.data.filter(a => a.id !== this.article?.id).slice(0, 3);
      }
    });
  }

  public get filteredRelatedArticles(): BlogArticle[] {
    if (!this.relatedArticles || !this.article) {
      return [];
    }
    return this.relatedArticles.filter(related => related.slug !== this.article?.slug);
  }

  public shareOnTwitter(): void {
    if (!this.article) return;
    const text = `${this.article.title} - ${window.location.href}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  public shareOnLinkedIn(): void {
    if (!this.article) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  public async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      console.log('Lien copié dans le presse-papiers');
    } catch (err) {
      console.error('Échec de la copie du lien:', err);
    }
  }

  public goBack(): void {
    window.history.back();
  }

  public formatDate(date: string): string {
    return this.blogService.formatPublishedDate(date);
  }

  protected readonly environment = environment;
}

