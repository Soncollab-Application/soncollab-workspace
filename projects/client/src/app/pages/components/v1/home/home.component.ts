import {AfterViewInit, Component, ElementRef, HostListener, ViewChild, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {PageService} from '../../../services/page.service';
import {Hero} from '../../../models/hero.model';
import {VideoManagerService} from '../../../../core/services/video-manager.service';
import {VideoSource} from '../../../../core/models/video-source.model';
import {LanguageService} from '../../../../core/services/language.service';

@Component({
  selector: 'app-home',
  imports: [
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  hero: Hero | null = null;
  isLoading = true;
  currentVideo: VideoSource | null = null;
  private destroy$ = new Subject<void>();

  private intersectionObserver?: IntersectionObserver;
  private videoLoaded = false;
  private userInteracted = false;
  private scrollThrottleTimer: number | null = null;
  private resizeThrottleTimer: number | null = null;

  // ✅ État pour suivre le mode actuel
  private currentMode: 'mobile' | 'desktop' = 'desktop';
  private videoContainer?: HTMLElement;

  constructor(
    private pageService: PageService,
    private videoManager: VideoManagerService,
    private languageService: LanguageService // ✅ Injection du service de langue
  ) {
    this.setupUserInteractionDetection();
  }

  ngOnInit(): void {
    this.initializeVideoRotation();
    this.setupLanguageListener(); // ✅ Écouter les changements de langue
    this.loadHeroData(); // Charger les données initiales
  }

  // ✅ Écouter les changements de langue
  private setupLanguageListener(): void {
    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newLanguage: string) => {
        this.loadHeroData(); // Recharger les données du hero
      });
  }

  private loadHeroData(): void {
    this.isLoading = true; // ✅ Afficher le loader lors du changement

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

  // ✅ Initialiser la rotation des vidéos
  private initializeVideoRotation(): void {
    this.currentVideo = this.videoManager.getCurrentVideo();

    // Logger les stats pour debug
    const stats = this.videoManager.getRotationStats();
  }

  ngAfterViewInit(): void {
    this.videoContainer = document.querySelector('.shared-video-container') as HTMLElement;
    this.initializeResponsiveVideo();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    if (this.scrollThrottleTimer) {
      cancelAnimationFrame(this.scrollThrottleTimer);
    }
    if (this.resizeThrottleTimer) {
      cancelAnimationFrame(this.resizeThrottleTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Écouter les changements de taille d'écran
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if (!this.resizeThrottleTimer) {
      this.resizeThrottleTimer = requestAnimationFrame(() => {
        this.handleResponsiveChange();
        this.resizeThrottleTimer = null;
      });
    }
  }

  // ✅ Initialiser la vidéo de façon responsive
  private initializeResponsiveVideo(): void {
    const newMode = this.isMobileDevice() ? 'mobile' : 'desktop';
    this.currentMode = newMode;

    if (newMode === 'mobile') {
      this.hideVideoOnMobile();
    } else {
      this.showVideoOnDesktop();
    }
  }

  // ✅ Gérer les changements responsive
  private handleResponsiveChange(): void {
    const newMode = this.isMobileDevice() ? 'mobile' : 'desktop';

    // Si le mode a changé
    if (newMode !== this.currentMode) {
      console.log(`Mode changé de ${this.currentMode} vers ${newMode}`);
      this.currentMode = newMode;

      if (newMode === 'mobile') {
        this.hideVideoOnMobile();
      } else {
        this.showVideoOnDesktop();
      }
    }
  }

  private setupUserInteractionDetection(): void {
    const markUserInteraction = () => {
      this.userInteracted = true;
      document.removeEventListener('click', markUserInteraction);
      document.removeEventListener('touchstart', markUserInteraction);
      document.removeEventListener('scroll', markUserInteraction);
    };

    document.addEventListener('click', markUserInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', markUserInteraction, { once: true, passive: true });
    document.addEventListener('scroll', markUserInteraction, { once: true, passive: true });
  }

  private setupLazyVideoLoading(): void {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.videoLoaded && !this.isMobileDevice()) {
          this.loadVideo();
        }
      });
    }, {
      rootMargin: '100px'
    });

    const videoElement = this.videoRef?.nativeElement;
    if (videoElement) {
      this.intersectionObserver.observe(videoElement);
    }
  }

  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // ✅ Cacher la vidéo sur mobile
  private hideVideoOnMobile(): void {
    const videoElement = this.videoRef?.nativeElement;

    if (videoElement) {
      videoElement.pause();
      videoElement.style.display = 'none';
    }

    if (this.videoContainer) {
      this.videoContainer.style.display = 'none';
    }

    // Désactiver l'observer
    this.intersectionObserver?.disconnect();
    this.videoLoaded = false;

    console.log('Vidéo cachée pour mobile');
  }

  // ✅ Montrer la vidéo sur desktop
  private showVideoOnDesktop(): void {
    const videoElement = this.videoRef?.nativeElement;

    if (videoElement) {
      videoElement.style.display = 'block';
    }

    if (this.videoContainer) {
      this.videoContainer.style.display = 'block';
    }

    // Réinitialiser et relancer le processus vidéo
    this.videoLoaded = false;
    this.setupLazyVideoLoading();
  }

  private loadVideo(): void {
    if (this.videoLoaded || this.isMobileDevice() || !this.currentVideo) return;

    this.videoLoaded = true;
    const videoElement = this.videoRef?.nativeElement;

    if (!videoElement) return;

    this.scheduleVideoLoad(videoElement);
  }

  private scheduleVideoLoad(videoElement: HTMLVideoElement): void {
    if (this.isMobileDevice()) {
      return;
    }

    const callback = () => {
      this.initializeVideo(videoElement);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 3000 });
    } else {
      setTimeout(callback, 500);
    }
  }

  private initializeVideo(videoElement: HTMLVideoElement): void {
    if (this.isMobileDevice() || !this.currentVideo) {
      return;
    }

    // ✅ Configurer la vidéo avec les sources de la vidéo actuelle
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.playsInline = true;
    videoElement.preload = 'metadata';
    videoElement.poster = this.currentVideo.poster;

    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');

    // ✅ Mettre à jour les sources vidéo
    this.updateVideoSources(videoElement);

    videoElement.load();

    if (this.userInteracted) {
      this.startVideoPlayback(videoElement);
    } else {
      this.setupVideoPlayOnInteraction(videoElement);
    }
  }

  private updateVideoSources(videoElement: HTMLVideoElement): void {
    if (!this.currentVideo) return;

    const sources = videoElement.querySelectorAll('source');

    // Mettre à jour les sources existantes
    sources.forEach(source => {
      const type = source.getAttribute('type');
      if (type === 'video/mp4') {
        source.setAttribute('src', this.currentVideo!.mp4);
      } else if (type === 'video/webm') {
        source.setAttribute('src', this.currentVideo!.webm);
      }
    });

    // Si pas de sources, les créer
    if (sources.length === 0) {
      videoElement.innerHTML = `
        <source src="${this.currentVideo.mp4}" type="video/mp4">
        <source src="${this.currentVideo.webm}" type="video/webm">
        Votre navigateur ne supporte pas les vidéos HTML5.
      `;
    }
  }

  private startVideoPlayback(videoElement: HTMLVideoElement): void {
    if (this.isMobileDevice()) {
      return;
    }

    const playVideo = () => {
      const playPromise = videoElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            //console.log(`✅ Vidéo "${this.currentVideo?.name}" démarrée avec succès`);
          })
          .catch(error => {
            console.warn(`⚠️ Lecture vidéo différée pour "${this.currentVideo?.name}":`, error.message);
          });
      }
    };

    requestAnimationFrame(() => {
      if (videoElement.readyState >= 2) {
        playVideo();
      } else {
        videoElement.addEventListener('loadeddata', playVideo, { once: true });
      }
    });
  }

  private setupVideoPlayOnInteraction(videoElement: HTMLVideoElement): void {
    if (this.isMobileDevice()) {
      return;
    }

    const playOnInteraction = () => {
      this.startVideoPlayback(videoElement);
      document.removeEventListener('click', playOnInteraction);
      document.removeEventListener('touchstart', playOnInteraction);
      document.removeEventListener('scroll', playOnInteraction);
    };

    document.addEventListener('click', playOnInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true, passive: true });
    document.addEventListener('scroll', playOnInteraction, { once: true, passive: true });
  }

  // ✅ Méthodes pour debug/admin (optionnelles)
  forceVideoRotation(): void {
    this.currentVideo = this.videoManager.rotateToNewVideo();
    if (!this.isMobileDevice()) {
      this.videoLoaded = false;
      this.loadVideo();
    }
  }

  getVideoStats(): any {
    return this.videoManager.getRotationStats();
  }

  // ✅ Méthode pour obtenir la langue actuelle (utile pour le template)
  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }
}
