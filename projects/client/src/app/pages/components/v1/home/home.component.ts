import {Component, OnDestroy, OnInit, computed} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {PageService} from '../../../services/page.service';
import {Hero} from '../../../models/hero.model';
import {TranslatePipe} from '@ngx-translate/core';
import {NgClass} from '@angular/common';
import {ContactModalService} from '../../../../core/services/contact-modal.service';
import {LanguageOrchestratorService, ThemeService} from 'shared-lib';

type FeatureType = 'catalog' | 'distribution' | 'royalties' | 'payment' | 'analytics' | 'teams';

interface FeatureData {
  key: FeatureType;
  titleKey: string;
  descriptionKey: string;
  imageSrc: string;
  imageAlt: string;
  link: string;
  reversed: boolean;
  icon: string;
}


@Component({
  selector: 'app-home',
  imports: [
    NgClass,
    TranslatePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  hero: Hero | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();
  private componentId = 'home';

  features: FeatureData[] = [
    {
      key: 'catalog',
      titleKey: 'home.features.catalog.title',
      descriptionKey: 'home.features.catalog.description',
      imageSrc: '/assets/images/features/catalog.png',
      imageAlt: 'Catalog',
      link: '/features/catalog',
      icon: "bi-collection",
      reversed: false
    },
    {
      key: 'distribution',
      titleKey: 'home.features.distribution.title',
      descriptionKey: 'home.features.distribution.description',
      imageSrc: '/assets/images/features/distribution.png',
      imageAlt: 'Distribution',
      link: '/features/distribution-delivery',
      reversed: true,
      icon: "bi-broadcast",
    },
    {
      key: 'royalties',
      titleKey: 'home.features.royalties.title',
      descriptionKey: 'home.features.royalties.description',
      imageSrc: '/assets/images/features/royalties.png',
      imageAlt: 'Royalties',
      link: '/features/royalties',
      reversed: false,
      icon: "bi-currency-dollar",
    },
    {
      key: 'payment',
      titleKey: 'home.features.payment.title',
      descriptionKey: 'home.features.payment.description',
      imageSrc: '/assets/images/features/payment.png',
      imageAlt: 'Payment',
      link: '/features/payments',
      reversed: true,
      icon: "bi-credit-card",
    },
    {
      key: 'analytics',
      titleKey: 'home.features.analytics.title',
      descriptionKey: 'home.features.analytics.description',
      imageSrc: '/assets/images/features/analytics.png',
      imageAlt: 'Analytics',
      link: '/features/analytics',
      reversed: false,
      icon: "bi-bar-chart-line",
    },
  ];

  isDarkTheme = computed(() => this.themeService.isDark());
  private hasInitialLoad = false;

  constructor(
    private pageService: PageService,
    private themeService: ThemeService,
    private contactModalService: ContactModalService,
    private languageOrchestrator: LanguageOrchestratorService) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.loadHeroData();
  }

  private onLanguageChange(): void {
    if (this.hasInitialLoad) {
      this.loadHeroData();
    }
  }

  openContactModal(): void {
    this.contactModalService.openContactModal().subscribe()
  }

  private loadHeroData(): void {
    this.isLoading = true;

    this.pageService.getHero()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hero) => {
          this.hasInitialLoad = true;
          this.hero = hero;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du hero:', error);
          this.isLoading = false;
          this.hasInitialLoad = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }
}
