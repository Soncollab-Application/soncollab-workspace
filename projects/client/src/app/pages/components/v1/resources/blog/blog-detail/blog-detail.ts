import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ToastService} from '../../../../../../core/modules/toast/toast.service';
import {BlogService} from '../../../../../services/blog.service';
import {LanguageService} from '../../../../../../core/services/language.service';
import {SeoService} from '../../../../../../core/services/seo.service';
import {environment} from '../../../../../../../environments/environment';
import {BlogArticle} from '../../../../../models/blog.model';

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
    private toast: ToastService,
    private seoService: SeoService
  ) {}

  public ngOnInit(): void {
    window.scrollTo(0, 0);
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
          const viewedKey = `blog_viewed_${this.slug}`;
          if (!sessionStorage.getItem(viewedKey)) {
            sessionStorage.setItem(viewedKey, 'true');
            this.blogService.trackArticleView(this.slug).subscribe();
          }
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
            reading_time: article.reading_time || this.blogService.calculateReadTime(article.content || article.excerpt || '')
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
    window.open(url, '_blank');
  }

  public shareOnLinkedIn(): void {
    if (!this.article) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  }

  public async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.toast.showSuccess(
        'Lien copié dans le presse-papiers',
        {
          position:'bottom-start',
          delay:3000,
          autohide: true,
        }
      );
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

