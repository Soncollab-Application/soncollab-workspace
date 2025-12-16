import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { HelpService } from '../../../../../services/help.service';
import { SeoService } from '../../../../../../core/services/seo.service';
import { HelpArticle, HelpArticleLocalization } from '../../../../../models/help.model';
import { NewsletterModalService } from '../../../../../../core/services/newsletter-modal.service';
import { ContactModalService } from '../../../../../../core/services/contact-modal.service';
import {
  LanguageOrchestratorService,
  LanguageService, ToastService
} from 'shared-lib';

@Component({
  selector: 'app-help-detail',
  templateUrl: './help-detail.html',
  imports: [
    CommonModule,
    TranslatePipe,
    RouterLink,
    MarkdownComponent,
    FormsModule
  ],
  standalone: true,
  styleUrls: ['./help-detail.css']
})
export class HelpDetail implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private componentId = 'help-detail';
  private languageService = inject(LanguageService);

  public article: HelpArticle | null = null;
  public relatedArticles: HelpArticle[] = [];
  public isLoading = false;
  public notFound = false;
  public helpfulnessRated = false;
  private slug = '';
  private hasInitialLoad = false;
  private isLanguageSwitch = false;

  availableTranslations = signal<HelpArticleLocalization[]>([]);
  currentLocale = computed(() => this.languageService.getCurrentLanguage());

  public showRatingModalFlag = false;
  public selectedRating = 0;
  public feedbackText = '';
  public selectedFeedbackCategories: string[] = [];

  contactModalService = inject(ContactModalService);

  constructor(
    private helpService: HelpService,
    private languageOrchestrator: LanguageOrchestratorService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private seoService: SeoService,
    private translateService: TranslateService,
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
    this.seoService.clearSEO();
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

  private onLanguageChange(): void {
    if (this.isLanguageSwitch) {
      this.isLanguageSwitch = false;
      return;
    }

    if (this.slug && this.hasInitialLoad) {
      this.loadArticle();
    }
  }

  openHelpNewsletter(): void {
    const source = `help_article_${this.slug}`;
    this.newsletterService.openNewsletterModal('help', source)
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

    const viewedKey = `help_viewed_${this.slug}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    const shouldTrackView = !alreadyViewed;

    if (shouldTrackView) {
      sessionStorage.setItem(viewedKey, 'true');
    }

    this.helpService.getArticleBySlug(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: article => {
          this.isLoading = false;
          this.hasInitialLoad = true;
          if (article) {
            this.article = article;
            this.setupAvailableTranslations();
            this.seoService.updateHelpArticleSEO(article);
            this.helpfulnessRated = this.isArticleRated(article.slug);
            this.loadRelatedArticles();

            if (shouldTrackView) {
              this.helpService.trackArticleView(this.slug, 'help');
            }
          } else {
            this.notFound = true;
            this.article = null;
          }
        },
        error: error => {
          this.isLoading = false;
          this.hasInitialLoad = true;
          console.error('Error loading article:', error);
          if (shouldTrackView) {
            sessionStorage.removeItem(viewedKey);
          }
        }
      });
  }

  private setupAvailableTranslations(): void {
    if (!this.article) return;

    const translations: HelpArticleLocalization[] = [];

    translations.push({
      id: this.article.id,
      locale: this.article.locale || this.currentLocale(),
      title: this.article.title,
      slug: this.article.slug
    });

    if (this.article.localizations) {
      translations.push(...this.article.localizations);
    }

    this.availableTranslations.set(translations);
  }

  switchLanguage(locale: string): void {
    const translation = this.availableTranslations().find(t => t.locale === locale);
    if (!translation) return;

    this.isLanguageSwitch = true;
    this.languageService.changeLanguage(locale);

    setTimeout(() => {
      this.router.navigate(['/help', translation.slug]).then(() => {
        this.isLanguageSwitch = false;
      });
    }, 100);
  }

  getLocaleLabel(locale: string): string {
    return locale === 'fr' ? '🇫🇷 Français' : '🇬🇧 English';
  }

  private loadRelatedArticles(): void {
    if (!this.article?.category) {
      return;
    }

    this.helpService.getArticlesByCategory(this.article.category.slug, 1, 4).pipe(takeUntil(this.destroy$)).subscribe(response => {
      if (response?.data) {
        this.relatedArticles = response.data.filter(a => a.id !== this.article?.id).slice(0, 3);
      }
    });
  }

  public get filteredRelatedArticles(): HelpArticle[] {
    if (!this.relatedArticles || !this.article) {
      return [];
    }
    return this.relatedArticles.filter(related => related.slug !== this.article?.slug);
  }

  public getDifficultyClass(level: string): string {
    switch (level) {
      case 'beginner': return 'bg-success-subtle text-success-emphasis';
      case 'intermediate': return 'bg-warning-subtle text-warning-emphasis';
      case 'advanced': return 'bg-danger-subtle text-danger-emphasis';
      default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
  }

  public getDifficultyLabel(level: string): string {
    return this.translateService.instant(`help.${level}`);
  }

  public rateHelpful(isHelpful: boolean): void {
    if (this.helpfulnessRated || !this.article?.documentId) return;

    const rating = isHelpful ? 5 : 1;
    this.showRatingModal(rating);
  }

  public showRatingModal(initialRating?: number): void {
    this.selectedRating = initialRating || 0;
    this.feedbackText = '';
    this.selectedFeedbackCategories = [];
    this.showRatingModalFlag = true;
  }

  public setRating(rating: number): void {
    this.selectedRating = rating;
  }

  public toggleFeedbackCategory(category: string): void {
    const index = this.selectedFeedbackCategories.indexOf(category);
    if (index > -1) {
      this.selectedFeedbackCategories.splice(index, 1);
    } else {
      this.selectedFeedbackCategories.push(category);
    }
  }

  public async submitRating(): Promise<void> {
    if (!this.article?.documentId || !this.selectedRating || this.helpfulnessRated) return;

    let feedback = '';
    if (this.feedbackText.trim()) {
      feedback = this.feedbackText.trim();
    }
    if (this.selectedFeedbackCategories.length > 0) {
      const categories = this.selectedFeedbackCategories.join(', ');
      feedback = feedback ? `${categories}: ${feedback}` : categories;
    }

    try {
      await this.helpService.rateArticle(
        this.article.documentId,
        this.selectedRating,
        feedback || undefined
      );

      this.helpfulnessRated = true;
      this.showRatingModalFlag = false;

      if (this.article?.slug) {
        this.saveRatedArticleToStorage(this.article.slug);
      }

      const message = this.translateService.instant('help.thankYouForRating');
      this.toast.showSuccess(message, {
        position: 'top-end',
        delay: 3000,
        autohide: true,
      });

    } catch (error) {
      console.error('Erreur lors de la notation:', error);
      const message = this.translateService.instant('help.ratingError');
      this.toast.showError(message, {
        position: 'top-end',
        delay: 3000,
        autohide: true,
      });
    }
  }

  public closeRatingModal(): void {
    this.showRatingModalFlag = false;
    this.selectedRating = 0;
    this.feedbackText = '';
    this.selectedFeedbackCategories = [];
  }

  public get feedbackCategories(): string[] {
    if (this.selectedRating <= 2) {
      return [
        this.translateService.instant('help.feedbackCategories.unclear'),
        this.translateService.instant('help.feedbackCategories.incomplete'),
        this.translateService.instant('help.feedbackCategories.outdated'),
        this.translateService.instant('help.feedbackCategories.wrong')
      ];
    } else if (this.selectedRating <= 3) {
      return [
        this.translateService.instant('help.feedbackCategories.couldBeImproved'),
        this.translateService.instant('help.feedbackCategories.moreExamples'),
        this.translateService.instant('help.feedbackCategories.betterExplanation')
      ];
    } else {
      return [
        this.translateService.instant('help.feedbackCategories.veryHelpful'),
        this.translateService.instant('help.feedbackCategories.wellExplained'),
        this.translateService.instant('help.feedbackCategories.goodExamples')
      ];
    }
  }

  public get ratingStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  private saveRatedArticleToStorage(articleSlug: string): void {
    try {
      const ratedArticlesKey = 'help_rated_articles';
      const existing = localStorage.getItem(ratedArticlesKey);
      let ratedArticles: string[] = [];

      if (existing) {
        ratedArticles = JSON.parse(existing);
      }

      if (!ratedArticles.includes(articleSlug)) {
        ratedArticles.push(articleSlug);
        localStorage.setItem(ratedArticlesKey, JSON.stringify(ratedArticles));
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'article noté:', error);
    }
  }

  private isArticleRated(articleSlug: string): boolean {
    try {
      const ratedArticlesKey = 'help_rated_articles';
      const existing = localStorage.getItem(ratedArticlesKey);

      if (existing) {
        const ratedArticles: string[] = JSON.parse(existing);
        return ratedArticles.includes(articleSlug);
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'article noté:', error);
      return false;
    }
  }

  public async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.toast.showSuccess(
        this.translateService.instant('help.linkCopied'),
        {
          position: 'top-end',
          delay: 3000,
          autohide: true,
        }
      );
    } catch (err) {
      console.error('Échec de la copie du lien:', err);
    }
  }

  public goBack(): void {
    this.router.navigate(['/help']);
  }

  public formatDate(date: string): string {
    if (!date) return '';
    return this.helpService.formatPublishedDate(date);
  }

  public navigateToRelated(article: HelpArticle): void {
    this.router.navigate(['/help', article.slug]);
  }

}
