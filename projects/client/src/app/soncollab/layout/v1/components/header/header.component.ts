import {Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {NgClass} from '@angular/common';
import {filter, Subscription} from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../../core/services/language.service';

// Déclaration pour Bootstrap (pour éviter les erreurs TypeScript)
declare var bootstrap: any;

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    NgClass,
    RouterLinkActive,
    TranslateModule // ✅ Ajout du module de traduction
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  showVideoBackground: boolean = false;
  isScrolled: boolean = false;

  @ViewChild('backgroundVideo') videoRef!: ElementRef<HTMLVideoElement>;

  private routerSubscription?: Subscription;
  private languageSubscription?: Subscription; // ✅ Subscription pour les changements de langue
  private ticking: boolean = false;

  constructor(
    private router: Router,
  ) {}

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
        this.showVideoBackground = this.isHomePage(event.urlAfterRedirects);

        // Fermer le menu mobile après navigation uniquement sur mobile
        if (window.innerWidth < 992) {
          setTimeout(() => {
            this.forceCloseOffcanvas();
          }, 150);
        }
      });
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.languageSubscription) {
      this.languageSubscription.unsubscribe();
    }
  }


  private forceCloseOffcanvas(): void {
    const offcanvasElement = document.getElementById('navbarNav');
    if (!offcanvasElement) return;

    // Méthode 1: Utiliser Bootstrap si disponible
    if (typeof bootstrap !== 'undefined') {
      try {
        const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
        if (offcanvasInstance) {
          offcanvasInstance.hide();
          return;
        }
      } catch (error) {
        console.log('Bootstrap method failed, using fallback');
      }
    }

    // Méthode 2: Simulation du clic sur le bouton close
    const closeButton = offcanvasElement.querySelector('.btn-close');
    if (closeButton) {
      (closeButton as HTMLElement).click();
      return;
    }

    // Méthode 3: Manipulation directe du DOM
    this.manualCloseOffcanvas();
  }

  private manualCloseOffcanvas(): void {
    const offcanvasElement = document.getElementById('navbarNav');
    if (!offcanvasElement) return;

    // Supprimer les classes Bootstrap
    offcanvasElement.classList.remove('show', 'showing');
    offcanvasElement.style.visibility = 'hidden';
    offcanvasElement.setAttribute('aria-hidden', 'true');

    // Supprimer le backdrop
    const backdrop = document.querySelector('.offcanvas-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Restaurer le body
    document.body.classList.remove('offcanvas-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    // Remettre la visibilité après l'animation
    setTimeout(() => {
      if (offcanvasElement) {
        offcanvasElement.style.visibility = '';
      }
    }, 300);
  }

  // Méthode publique pour fermer le menu (utilisable dans le template)
  public closeMenu(): void {
    // Seulement sur mobile
    if (window.innerWidth < 992) {
      // Utiliser la méthode native de Bootstrap d'abord
      const offcanvasElement = document.getElementById('navbarNav');
      if (offcanvasElement) {
        const closeButton = offcanvasElement.querySelector('.btn-close');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        }
      }
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
