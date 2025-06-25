import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  private intersectionObserver?: IntersectionObserver;
  private videoLoaded = false;
  private userInteracted = false;
  private scrollThrottleTimer: number | null = null;

  constructor() {
    this.setupUserInteractionDetection();
  }

  ngAfterViewInit(): void {
    this.setupLazyVideoLoading();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    if (this.scrollThrottleTimer) {
      cancelAnimationFrame(this.scrollThrottleTimer);
    }
  }

  private setupUserInteractionDetection(): void {
    const markUserInteraction = () => {
      this.userInteracted = true;
      document.removeEventListener('click', markUserInteraction);
      document.removeEventListener('touchstart', markUserInteraction);
      document.removeEventListener('scroll', markUserInteraction);
    };

    document.addEventListener('click', markUserInteraction, {once: true, passive: true});
    document.addEventListener('touchstart', markUserInteraction, {once: true, passive: true});
    document.addEventListener('scroll', markUserInteraction, {once: true, passive: true});
  }

  private setupLazyVideoLoading(): void {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.videoLoaded) {
          if (this.isMobileDevice()) {
            setTimeout(() => this.loadVideo(), 1000);
          } else {
            this.loadVideo();
          }
        }
      });
    }, {
      rootMargin: '100px',
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
      requestIdleCallback(callback, {timeout: 3000});
    } else {
      setTimeout(callback, 500);
    }
  }

  private initializeVideo(videoElement: HTMLVideoElement): void {
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.playsInline = true;
    videoElement.preload = this.isMobileDevice() ? 'none' : 'metadata';
    if (this.isMobileDevice()) {
      videoElement.style.transform = 'scale(1.1)';
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
            videoElement.style.display = 'none';
          });
      }
    };

    requestAnimationFrame(() => {
      if (videoElement.readyState >= 2) {
        playVideo();
      } else {
        videoElement.addEventListener('loadeddata', playVideo, {once: true});
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

    document.addEventListener('click', playOnInteraction, {once: true, passive: true});
    document.addEventListener('touchstart', playOnInteraction, {once: true, passive: true});
    document.addEventListener('scroll', playOnInteraction, {once: true, passive: true});
  }

}
