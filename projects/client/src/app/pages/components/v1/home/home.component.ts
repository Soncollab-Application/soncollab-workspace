import {AfterViewInit, Component, ElementRef, HostListener, ViewChild, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {PageService} from '../../../services/page.service';
import {Hero} from '../../../models/hero.model';

@Component({
  selector: 'app-home',
  imports: [
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements   OnInit,  AfterViewInit, OnDestroy {
  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  hero: Hero | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();

  private intersectionObserver?: IntersectionObserver;
  private videoLoaded = false;
  private userInteracted = false;
  private scrollThrottleTimer: number | null = null;

  constructor(private pageService: PageService) {
    this.setupUserInteractionDetection();
  }

  ngOnInit(): void {
    this.loadHeroData();
  }


  private loadHeroData(): void {
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

  ngAfterViewInit(): void {
    this.setupLazyVideoLoading();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    if (this.scrollThrottleTimer) {
      cancelAnimationFrame(this.scrollThrottleTimer);
    }

    this.destroy$.next();
    this.destroy$.complete();
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
        if (entry.isIntersecting && !this.videoLoaded) {
          // Retarder le chargement vidéo sur mobile
          if (this.isMobileDevice()) {
            setTimeout(() => this.loadVideo(), 1000);
          } else {
            this.loadVideo();
          }
        }
      });
    }, {
      rootMargin: '100px' // Augmenté pour mobile
    });

    const videoElement = this.videoRef?.nativeElement;
    if (videoElement) {
      this.intersectionObserver.observe(videoElement);
    }
  }

  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private loadVideo(): void {
    if (this.videoLoaded) return;

    this.videoLoaded = true;
    const videoElement = this.videoRef?.nativeElement;

    if (!videoElement) return;

    // Sur mobile, attendre que l'utilisateur interagisse avant de charger
    if (this.isMobileDevice() && !this.userInteracted) {
      this.setupVideoPlayOnInteraction(videoElement);
      return;
    }

    this.scheduleVideoLoad(videoElement);
  }

  private scheduleVideoLoad(videoElement: HTMLVideoElement): void {
    const callback = () => {
      this.initializeVideo(videoElement);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 3000 });
    } else {
      setTimeout(callback, 500); // Augmenté pour mobile
    }
  }

  private initializeVideo(videoElement: HTMLVideoElement): void {
    // Configuration optimisée pour mobile
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.playsInline = true;
    videoElement.preload = this.isMobileDevice() ? 'none' : 'metadata';

    // Réduire la qualité sur mobile si possible
    if (this.isMobileDevice()) {
      videoElement.style.transform = 'scale(1.1)'; // Léger zoom pour masquer la compression
    }

    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');

    const sources = videoElement.querySelectorAll('source');
    sources.forEach(source => {
      const dataSrc = source.getAttribute('data-src');
      if (dataSrc) {
        source.setAttribute('src', dataSrc);
      }
    });

    videoElement.load();

    if (this.userInteracted) {
      this.startVideoPlayback(videoElement);
    } else {
      this.setupVideoPlayOnInteraction(videoElement);
    }
  }

  private startVideoPlayback(videoElement: HTMLVideoElement): void {
    const playVideo = () => {
      const playPromise = videoElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Vidéo démarrée avec succès');
          })
          .catch(error => {
            console.warn('Lecture vidéo différée:', error.message);
            // Fallback : masquer la vidéo et afficher l'image de fond
            videoElement.style.display = 'none';
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

}
