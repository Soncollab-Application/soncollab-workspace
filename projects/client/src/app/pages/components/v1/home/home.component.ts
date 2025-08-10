import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, Subscription, takeUntil} from 'rxjs';
import {PageService} from '../../../services/page.service';
import {Hero} from '../../../models/hero.model';
import {LanguageService} from '../../../../core/services/language.service';
import {TranslatePipe} from '@ngx-translate/core';
import {SwiperDirective} from '../../../../core/utils/directives/swiper.directive';
import {SwiperOptions} from 'swiper/types';
import {ThemeService} from '../../../../core/services/theme.service';
import {NgClass, NgStyle} from '@angular/common';
import {ContactModalService} from '../../../../core/services/contact-modal.service';
import {ContactModal} from '../partials/modals/contact-modal/contact-modal';

// Types
type FeatureType = 'catalog' | 'distribution' | 'royalties' | 'payment' | 'analytics' | 'teams';

interface GradientStyle {
  background: string;
}

interface ButtonGradientStyle {
  background: string;
  color: string;
  border: string;
}

interface FeatureData {
  key: FeatureType;
  titleKey: string;
  descriptionKey: string;
  imageSrc: string;
  imageAlt: string;
  reversed: boolean; // Pour alterner la disposition
}

type BackgroundGradients = Record<FeatureType, GradientStyle>;
type ButtonGradients = Record<FeatureType, ButtonGradientStyle>;

@Component({
  selector: 'app-home',
  imports: [
    SwiperDirective,
    NgStyle,
    NgClass,
    TranslatePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit ,OnDestroy {

  hero: Hero | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();

  eventsConfig: SwiperOptions = {
    slidesPerView: 1,
    spaceBetween: 24,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    navigation: {
      prevEl: '#events-prev',
      nextEl: '#events-next'
    },
    breakpoints: {
      500: {
        slidesPerView: 1
      },
      992: {
        slidesPerView: 2
      },
      1200: {
        slidesPerView: 'auto'
      }
    }
  };

  features: FeatureData[] = [
    {
      key: 'catalog',
      titleKey: 'home.features.catalog.title',
      descriptionKey: 'home.features.catalog.description',
      imageSrc: '/assets/images/features/catalog.png',
      imageAlt: 'Catalog',
      reversed: false
    },
    {
      key: 'distribution',
      titleKey: 'home.features.distribution.title',
      descriptionKey: 'home.features.distribution.description',
      imageSrc: '/assets/images/features/distribution.png',
      imageAlt: 'Distribution',
      reversed: true
    },
    {
      key: 'royalties',
      titleKey: 'home.features.royalties.title',
      descriptionKey: 'home.features.royalties.description',
      imageSrc: '/assets/images/features/royalties.png',
      imageAlt: 'Royalties',
      reversed: false
    },
    {
      key: 'payment',
      titleKey: 'home.features.payment.title',
      descriptionKey: 'home.features.payment.description',
      imageSrc: '/assets/images/features/payment.png',
      imageAlt: 'Payment',
      reversed: true
    },
    {
      key: 'analytics',
      titleKey: 'home.features.analytics.title',
      descriptionKey: 'home.features.analytics.description',
      imageSrc: '/assets/images/features/analytics.png',
      imageAlt: 'Analytics',
      reversed: false
    },
  ];



  private themeSubscription!: Subscription;
  isDarkTheme = false;

  constructor(
    private pageService: PageService,
    private themeService: ThemeService,
    private contactModalService: ContactModalService,
    private languageService: LanguageService) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.setupLanguageListener();
    this.loadHeroData();

    this.themeSubscription = this.themeService.theme$.subscribe(() => {
      this.isDarkTheme = this.themeService.isDarkTheme();
    });

    this.isDarkTheme = this.themeService.isDarkTheme();
  }


  openContactModal(): void {
    this.contactModalService.openContactModal().subscribe()
  }


  private setupLanguageListener(): void {
    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newLanguage: string) => {
        this.loadHeroData(); // Recharger les données du hero
      });
  }

  private loadHeroData(): void {
    this.isLoading = true;

    this.pageService.getHero()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hero) => {
          this.hero = hero;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du hero:', error);
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }


  private getLightGradients(): BackgroundGradients {
    return {
      // Catalog - Bleu doux
      catalog: {
        background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)'
      },
      // Distribution - Vert émeraude (votre couleur principale)
      distribution: {
        background: 'linear-gradient(135deg, #E8F5F0 0%, #D1E7DD 100%)'
      },
      // Royalties - Violet élégant
      royalties: {
        background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)'
      },
      // Payment - Orange chaleureux
      payment: {
        background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)'
      },
      // Analytics - Rose moderne
      analytics: {
        background: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)'
      },
      // Teams - Cyan frais
      teams: {
        background: 'linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%)'
      }
    };
  }

// Gradients pour le thème DARK - Version colorée
  private getDarkGradients(): BackgroundGradients {
    return {
      // Catalog - Gris-bleu très subtil
      catalog: {
        background: 'linear-gradient(135deg, #2A2D32 0%, #353A42 100%)'
      },
      // Distribution - Gris-vert très doux
      distribution: {
        background: 'linear-gradient(135deg, #2A3530 0%, #354240 100%)'
      },
      // Royalties - Gris-violet imperceptible
      royalties: {
        background: 'linear-gradient(135deg, #322A35 0%, #423542 100%)'
      },
      // Payment - Gris-orange très léger
      payment: {
        background: 'linear-gradient(135deg, #352A20 0%, #453520 100%)'
      },
      // Analytics - Gris-rose à peine visible
      analytics: {
        background: 'linear-gradient(135deg, #32282A 0%, #423538 100%)'
      },
      // Teams - Gris-cyan très subtil
      teams: {
        background: 'linear-gradient(135deg, #252F2D 0%, #354240 100%)'
      }
    };
  }


  private getDarkGradientsMonochrome(): BackgroundGradients {
    return {
      catalog: { background: 'linear-gradient(135deg, #2C2C2E 0%, #3A3A3C 100%)' },
      distribution: { background: 'linear-gradient(135deg, #2D2F2C 0%, #3B3D3A 100%)' },
      royalties: { background: 'linear-gradient(135deg, #2E2C2F 0%, #3C3A3D 100%)' },
      payment: { background: 'linear-gradient(135deg, #2F2D2A 0%, #3D3B38 100%)' },
      analytics: { background: 'linear-gradient(135deg, #2E2B2C 0%, #3C393A 100%)' },
      teams: { background: 'linear-gradient(135deg, #2B2E2D 0%, #393C3B 100%)' }
    };
  }



  // Méthodes publiques
  getBackgroundGradient(feature: FeatureType): GradientStyle {
    const gradients = this.isDarkTheme ? this.getDarkGradients() : this.getLightGradients();
    return gradients[feature];
  }


  getButtonClass(): string {
    return this.isDarkTheme ? 'btn-dark' : 'btn-primary';
  }


}
