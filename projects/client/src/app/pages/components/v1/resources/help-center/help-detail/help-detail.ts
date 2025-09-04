import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { ToastService } from '../../../../../../core/modules/toast/toast.service';
import { HelpService } from '../../../../../services/help.service';
import { LanguageService } from '../../../../../../core/services/language.service';
import { SeoService } from '../../../../../../core/services/seo.service';
import { HelpArticle } from '../../../../../models/help.model';
import {NewsletterModalService} from '../../../../../../core/services/newsletter-modal.service';
import {ContactModalService} from '../../../../../../core/services/contact-modal.service';

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

  public article: HelpArticle | null = null;
  public relatedArticles: HelpArticle[] = [];
  public isLoading = false;
  public notFound = false;
  public helpfulnessRated = false;
  private slug = '';

  // Propriétés pour le modal de rating
  public showRatingModalFlag = false;
  public selectedRating = 0;
  public feedbackText = '';
  public selectedFeedbackCategories: string[] = [];

  contactModalService = inject(ContactModalService);

  constructor(
    private helpService: HelpService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
    private seoService: SeoService,
    private translateService: TranslateService,
    private newsletterService: NewsletterModalService
  ) {}

  public ngOnInit(): void {
    window.scrollTo(0, 0);
    this.setupRouteListener();
    this.setupLanguageListener();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.seoService.clearSEO();
  }

  private setupRouteListener(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.slug = params['slug'];
      if (this.slug) {
        this.loadArticle();
        const viewedKey = `help_viewed_${this.slug}`;
        if (!sessionStorage.getItem(viewedKey)) {
          sessionStorage.setItem(viewedKey, 'true');
          this.helpService.incrementViewCount(this.slug).subscribe();
        }
      }
    });
  }

  private setupLanguageListener(): void {
    this.languageService.currentLanguage$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.slug) {
        this.loadArticle();
      }
    });
  }

  openHelpNewsletter(): void {
    const source = `help_article_${this.slug}`;
    this.newsletterService.openNewsletterModal('help', source)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result.cancelled) {
            // Abonnement réussi
            console.log('Newsletter subscription successful:', result);
          }
        },
        error: (error) => {
          console.error('Newsletter modal error:', error);
        }
      });
  }



  private loadArticle(): void {
    this.isLoading = true;
    this.notFound = false;

    this.helpService.getArticleBySlug(this.slug).pipe(takeUntil(this.destroy$)).subscribe(article => {
      this.isLoading = false;
      if (article) {
        this.article = article;
        this.seoService.updateHelpArticleSEO(article);

        // Vérifier si l'article a déjà été noté
        this.helpfulnessRated = this.isArticleRated(article.slug);

        this.loadRelatedArticles();
      } else {
        this.notFound = true;
        this.article = null;
      }
    });
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

  // Méthodes de rating - Version simple avec boutons Oui/Non
  public rateHelpful(isHelpful: boolean): void {
    if (this.helpfulnessRated || !this.article?.documentId) return;

    // Convertir true/false en note 1-5 (true = 5, false = 1)
    const rating = isHelpful ? 5 : 1;

    // Toujours proposer le modal de rating détaillé
    this.showRatingModal(rating);
  }

  // Méthodes pour le modal de rating détaillé
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

  public submitRating(): void {
    if (!this.article?.documentId || !this.selectedRating || this.helpfulnessRated) return;

    let feedback = '';
    if (this.feedbackText.trim()) {
      feedback = this.feedbackText.trim();
    }
    if (this.selectedFeedbackCategories.length > 0) {
      const categories = this.selectedFeedbackCategories.join(', ');
      feedback = feedback ? `${categories}: ${feedback}` : categories;
    }

    this.helpService.rateArticle(
      this.article.documentId,
      this.selectedRating,
      feedback || undefined
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.helpfulnessRated = true;
        this.showRatingModalFlag = false;

        // Sauvegarder localement que l'utilisateur a noté cet article
        if (this.article?.slug) {
          this.saveRatedArticleToStorage(this.article.slug);
        }

        const message = this.translateService.instant('help.thankYouForRating');
        this.toast.showSuccess(message, {
          position: 'top-end',
          delay: 3000,
          autohide: true,
        });

        // Mettre à jour le score local si retourné
        if (response?.data?.newScore && this.article) {
          this.article.helpfulness_score = response.data.newScore;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la notation:', error);
        const message = this.translateService.instant('help.ratingError');
        this.toast.showError(message, {
          position: 'top-end',
          delay: 3000,
          autohide: true,
        });
      }
    });
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

  /**
   * Sauvegarde localement qu'un article a été noté pour éviter les notations multiples
   */
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

  /**
   * Vérifie si un article a déjà été noté par l'utilisateur
   */
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

  // Autres méthodes utilitaires
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
