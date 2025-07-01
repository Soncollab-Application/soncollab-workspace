import {Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {NgClass} from '@angular/common';
import {filter, Subscription} from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    NgClass,
    RouterLinkActive,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  showVideoBackground: boolean = false;
  isScrolled: boolean = false;

  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  private routerSubscription?: Subscription;
  private ticking: boolean = false;

  constructor(private router: Router) {
  }

  // Scroll optimisé avec requestAnimationFrame et passive listener
  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    // Ne pas empêcher le comportement par défaut
    if (!this.ticking) {
      requestAnimationFrame(() => {
        this.updateScrollState();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  ngOnInit(): void {
    this.checkCurrentRoute();

    // Utiliser une subscription pour pouvoir la désabonner proprement
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('NavigationEnd:', event);
        this.showVideoBackground = this.isHomePage(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateScrollState(): void {
    // Utiliser une méthode plus robuste pour détecter le scroll
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollY > 50;
  }

  private checkCurrentRoute(): void {
    this.showVideoBackground = this.isHomePage(this.router.url);
  }

  private isHomePage(url: string): boolean {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return cleanUrl === '/' || cleanUrl === '';
  }

  isSectionActive(baseRoute: string): boolean {
    return this.router.url.startsWith(baseRoute);
  }
}
