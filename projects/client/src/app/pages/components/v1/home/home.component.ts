import {AfterViewInit, Component, ElementRef, inject, OnDestroy, ViewChild} from '@angular/core';
import {CacheService} from '../../../../core/services/cache.service';
import {AppInitService} from '../../../../core/services/app-init.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  private cacheService = inject(CacheService);
  private appInitService = inject(AppInitService);
  private intersectionObserver?: IntersectionObserver;
  private userInteracted = false;
  private videoLoadAttempted = false;

  constructor() {
    // Préchargement immédiat des assets les plus critiques seulement
    this.preloadMostCriticalAssets();

    // Setup user interaction mais de façon plus légère
    this.setupUserInteractionDetection();

    // S'assurer que l'app est initialisée en arrière-plan
    this.ensureAppInitialization();
  }

  ngAfterViewInit(): void {
    // Configuration immédiate du lazy loading vidéo
    this.setupLazyVideoLoading();

    // Préchargement différé des autres assets
    this.scheduleSecondaryAssetPreloading();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  /**
   * Précharge uniquement les assets absolument critiques pour le premier affichage
   */
  private preloadMostCriticalAssets(): void {
    const criticalAssets = [
      '/assets/images/hero-fallback.jpg', // Image de fallback pour la vidéo
      '/assets/images/logo/soncollablightlogo.svg' // Logo principal
    ];

    // Utilisation de haute priorité pour ces assets critiques
    this.cacheService.preloadCriticalAssets(criticalAssets);
  }

  /**
   * Programme le préchargement des assets secondaires après le rendu initial
   */
  private scheduleSecondaryAssetPreloading(): void {
    // Attendre que le composant soit rendu et stable
    setTimeout(() => {
      requestIdleCallback(() => {
        const secondaryAssets = [
          '/assets/images/for_ld/catalog.svg',
          '/assets/images/for_ld/distribution.svg',
          '/assets/images/for_ld/royalties.svg',
          '/assets/images/for_ld/payment.svg'
        ];

        this.cacheService.preloadAssets(secondaryAssets, 'medium');
      });
    }, 1000); // 1 seconde après le rendu initial
  }

  /**
   * S'assure que l'app est initialisée en arrière-plan
   */
  private ensureAppInitialization(): void {
    // Vérification non-bloquante
    requestIdleCallback(() => {
      if (!this.appInitService.isInitialized()) {
        this.appInitService.ensureInitialized();
      }
    });
  }

  private setupUserInteractionDetection(): void {
    // Vérifier d'abord le cache
    if (this.cacheService.has('user_interaction_setup')) {
      this.userInteracted = this.cacheService.get('user_interacted') || false;
      return;
    }

    const markUserInteraction = () => {
      this.userInteracted = true;
      this.cacheService.set('user_interacted', true, 10 * 60 * 1000, 'high'); // 10min, haute priorité

      // Nettoyage immédiat des listeners
      document.removeEventListener('click', markUserInteraction);
      document.removeEventListener('touchstart', markUserInteraction);
      document.removeEventListener('scroll', markUserInteraction);

      // Si la vidéo est visible, la démarrer immédiatement
      if (this.videoRef?.nativeElement && this.videoLoadAttempted) {
        this.startVideoPlayback(this.videoRef.nativeElement);
      }
    };

    // Listeners passifs pour optimiser les performances
    document.addEventListener('click', markUserInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', markUserInteraction, { once: true, passive: true });
    document.addEventListener('scroll', markUserInteraction, { once: true, passive: true });

    this.cacheService.set('user_interaction_setup', true, 60 * 60 * 1000, 'medium'); // 1h
  }

  private setupLazyVideoLoading(): void {
    // Vérifier si la vidéo est déjà configurée
    if (this.cacheService.has('video_configured')) {
      this.quickVideoSetup();
      return;
    }

    // Observer avec des options optimisées pour les performances
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.videoLoadAttempted) {
          this.videoLoadAttempted = true;

          // Délai minimal pour éviter le blocage
          requestAnimationFrame(() => {
            this.loadVideo();
          });

          // Disconnect après le premier déclenchement
          this.intersectionObserver?.disconnect();
        }
      });
    }, {
      rootMargin: '100px', // Démarrer le chargement un peu avant que la vidéo soit visible
      threshold: 0.1 // Seuil bas pour déclencher tôt
    });

    const videoElement = this.videoRef?.nativeElement;
    if (videoElement) {
      this.intersectionObserver.observe(videoElement);
    }
  }

  /**
   * Configuration rapide de la vidéo depuis le cache
   */
  private quickVideoSetup(): void {
    const videoElement = this.videoRef?.nativeElement;
    if (!videoElement) return;

    const cachedConfig = this.cacheService.get('video_config');
    if (cachedConfig) {
      Object.assign(videoElement, cachedConfig);

      if (this.userInteracted) {
        this.startVideoPlayback(videoElement);
      }
    }
  }

  private isMobileDevice(): boolean {
    // Cache plus durable pour éviter les recalculs
    return this.cacheService.getOrSet(
      'is_mobile_device',
      () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      24 * 60 * 60 * 1000, // 24h au lieu d'1h
      'high'
    ) as unknown as boolean;
  }

  private loadVideo(): void {
    const videoElement = this.videoRef?.nativeElement;
    if (!videoElement) return;

    const isMobile = this.isMobileDevice();
    const userInteracted = this.cacheService.get('user_interacted') || this.userInteracted;

    // Configuration optimisée
    const config = {
      muted: true,
      loop: true,
      playsInline: true,
      preload: isMobile ? 'none' : 'metadata'
    };

    // Cache la configuration
    this.cacheService.set('video_config', config, 30 * 60 * 1000, 'medium');
    this.cacheService.set('video_configured', true, 30 * 60 * 1000, 'medium');

    Object.assign(videoElement, config);

    // Optimisations mobile
    if (isMobile) {
      videoElement.style.transform = 'scale(1.1)';
    }

    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');

    // Chargement avec requestIdleCallback pour ne pas bloquer
    const loadVideoContent = () => {
      videoElement.load();

      if (userInteracted) {
        this.startVideoPlayback(videoElement);
      } else {
        this.setupVideoPlayOnInteraction(videoElement);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadVideoContent, { timeout: 1000 });
    } else {
      setTimeout(loadVideoContent, 100);
    }
  }

  private startVideoPlayback(videoElement: HTMLVideoElement): void {
    // Vérifier si la vidéo n'est pas déjà en cours de lecture
    if (!videoElement.paused) return;

    const playVideo = () => {
      const playPromise = videoElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.cacheService.set('video_playing', true, 5 * 60 * 1000, 'low');
          })
          .catch(error => {
            console.warn('⚠️ Lecture vidéo différée:', error.message);
            // Masquer la vidéo en cas d'échec pour éviter un écran noir
            videoElement.style.opacity = '0';
          });
      }
    };

    if (videoElement.readyState >= 2) {
      playVideo();
    } else {
      videoElement.addEventListener('loadeddata', playVideo, { once: true });
    }
  }

  private setupVideoPlayOnInteraction(videoElement: HTMLVideoElement): void {
    // Éviter la double configuration
    if (this.cacheService.has('video_interaction_setup')) return;

    const playOnInteraction = () => {
      this.startVideoPlayback(videoElement);
      this.cacheService.set('user_interacted', true, 10 * 60 * 1000, 'high');

      // Nettoyage des listeners
      document.removeEventListener('click', playOnInteraction);
      document.removeEventListener('touchstart', playOnInteraction);
      document.removeEventListener('scroll', playOnInteraction);
    };

    document.addEventListener('click', playOnInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true, passive: true });
    document.addEventListener('scroll', playOnInteraction, { once: true, passive: true });

    this.cacheService.set('video_interaction_setup', true, 30 * 60 * 1000, 'medium');
  }
}
