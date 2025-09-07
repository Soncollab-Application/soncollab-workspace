import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {MarkdownComponent} from 'ngx-markdown';
import {ToastService} from '../../../../../../core/modules/toast/toast.service';
import {BlogService} from '../../../../../services/blog.service';
import {SeoService} from '../../../../../../core/services/seo.service';
import {environment} from '../../../../../../../environments/environment';
import {BlogArticle} from '../../../../../models/blog.model';
import {NewsletterModalService} from '../../../../../../core/services/newsletter-modal.service';
import {LanguageOrchestratorService} from '../../../../../../core/services/language-orchestrator.service';

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
  private componentId = 'blog-detail';


  public article: BlogArticle | null = null;
  public relatedArticles: BlogArticle[] = [];
  public isLoading = false;
  public notFound = false;
  private slug = '';
  private hasInitialLoad = false;

  constructor(
    private blogService: BlogService,
    private languageOrchestrator: LanguageOrchestratorService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private seoService: SeoService,
    private newsletterService: NewsletterModalService
  ) {}

  public ngOnInit(): void {
    window.scrollTo(0, 0);

    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.setupRouteListener();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }

  private onLanguageChange(): void {
    if (this.slug && this.hasInitialLoad) {
      this.loadArticle();
    }
  }

  private setupRouteListener(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const newSlug = params['slug'];

        if (newSlug && newSlug !== this.slug) {
          this.slug = newSlug;
          this.loadArticle();
        } else if (newSlug) {
          this.slug = newSlug;
          if (!this.hasInitialLoad) {
            this.loadArticle();
          }
        }
      });
  }

  openBlogNewsletter(): void {
    const source = `blog_article_${this.slug}`;
    this.newsletterService.openNewsletterModal('blog', source)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result.cancelled) {}
        },
        error: (error) => {
          console.error('Newsletter modal error:', error);
        }
      });
  }

  private async loadArticle(): Promise<void> {
    this.isLoading = true;
    this.notFound = false;
    this.article = null;

    // Protection sessionStorage pour éviter doubles tracking
    const viewedKey = `blog_viewed_${this.slug}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    const shouldTrackView = !alreadyViewed;

    if (shouldTrackView) {
      sessionStorage.setItem(viewedKey, 'true');
    }

    this.blogService.getArticleBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: article => {
          this.isLoading = false;
          this.hasInitialLoad = true;
          if (article) {
            this.article = {
              ...article,
              reading_time: article.reading_time || this.blogService.calculateReadTime(article.content || article.excerpt || '')
            };

            this.seoService.updateBlogArticleSEO(article);
            this.loadRelatedArticles();

            if (shouldTrackView) {
              this.blogService.trackArticleView(this.slug, 'blog');
            }
          } else {
            this.notFound = true;
          }
        },
        error: error => {
          this.isLoading = false;
          this.hasInitialLoad = true;
          console.error('Error loading blog article:', error);

          if (shouldTrackView) {
            sessionStorage.removeItem(viewedKey);
          }
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
          position:'top-end',
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

