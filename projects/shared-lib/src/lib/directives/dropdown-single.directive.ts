import { Directive, ElementRef, HostListener, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[libDropdownSingle]',
  standalone: true
})
export class DropdownSingleDirective implements OnDestroy {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  @HostListener('show.bs.dropdown')
  onShow(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Chercher dans les tables OU dans les data-cards
      const table = this.el.nativeElement.closest('table');
      const dataCardContainer = this.el.nativeElement.closest('.row');

      const container = table || dataCardContainer;

      if (container) {
        const allDropdowns = container.querySelectorAll('[libDropdownSingle] .dropdown-menu.show');
        allDropdowns.forEach((menu: any) => {
          if (menu !== this.el.nativeElement.querySelector('.dropdown-menu')) {
            menu.classList.remove('show');
            const btn = menu.previousElementSibling as HTMLElement;
            if (btn) {
              btn.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (isPlatformBrowser(this.platformId)) {
      const target = event.target as HTMLElement;

      // Vérifier que c'est bien un dropdown-item ET qu'on est dans une table OU data-card
      const isInTable = this.el.nativeElement.closest('table');
      const isInDataCard = this.el.nativeElement.closest('.card');
      const isDropdownItem = target.classList.contains('dropdown-item') || target.closest('.dropdown-item');

      if ((isInTable || isInDataCard) && isDropdownItem) {
        const dropdown = this.el.nativeElement.querySelector('.dropdown-menu');
        const button = this.el.nativeElement.querySelector('[data-bs-toggle="dropdown"]');

        if (dropdown && button) {
          dropdown.classList.remove('show');
          button.setAttribute('aria-expanded', 'false');
        }
      }
    }
  }

  ngOnDestroy(): void {}
}
