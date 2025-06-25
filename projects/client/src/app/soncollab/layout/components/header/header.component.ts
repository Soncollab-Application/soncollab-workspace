import {Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {NgClass} from '@angular/common';
import {filter} from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    NgClass,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  showVideoBackground: boolean = false;
  isScrolled: boolean = false;

  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  private scrollThrottleTimer: number | null = null;
  private ticking: boolean = false;

  constructor(private router: Router) {}

  // Scroll optimisé avec requestAnimationFrame
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.updateScrollState();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  private updateScrollState(): void {
    const scrollY = window.scrollY || window.pageYOffset;
    this.isScrolled = scrollY > 50;
  }

  ngOnInit(): void {
    this.checkCurrentRoute();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('NavigationEnd:', event);
        this.showVideoBackground = this.isHomePage(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    if (this.scrollThrottleTimer) {
      cancelAnimationFrame(this.scrollThrottleTimer);
    }
  }

  private checkCurrentRoute(): void {
    this.showVideoBackground = this.isHomePage(this.router.url);
  }

  private isHomePage(url: string): boolean {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return cleanUrl === '/' || cleanUrl === '';
  }
}
