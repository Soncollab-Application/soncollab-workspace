import {Component, HostListener, OnInit} from '@angular/core';
import { Router, RouterLink, RouterLinkActive} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {StickyDirective} from '../../../../../core/utils/directives/sticky.directive';
import {NgClass} from '@angular/common';


@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    NgClass
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  private ticking: boolean = false;
  isScrolled: boolean = false;

  constructor(
    private router: Router,
  ) {}


  ngOnInit(): void {
  }

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

  private updateScrollState(): void {
    // Utiliser une méthode plus robuste pour détecter le scroll
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollY > 50;
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

  private isHomePage(url: string): boolean {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return cleanUrl === '/' || cleanUrl === '';
  }

  isSectionActive(baseRoute: string): boolean {
    return this.router.url.startsWith(baseRoute);
  }

}
