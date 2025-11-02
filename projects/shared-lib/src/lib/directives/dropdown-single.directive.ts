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
    if (!isPlatformBrowser(this.platformId)) return;

    // Chercher dans les tables OU dans les data-cards
    const table = this.el.nativeElement.closest('table');
    const dataCardContainer = this.el.nativeElement.closest('.row');
    const container = table || dataCardContainer;

    if (container) {
      // Fermer tous les autres dropdowns dans le même container
      const allDropdowns = container.querySelectorAll('[libDropdownSingle]');
      allDropdowns.forEach((dropdownEl: Element) => {
        if (dropdownEl !== this.el.nativeElement) {
          const toggleButton = dropdownEl.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement;

          if (toggleButton && typeof (window as any).bootstrap !== 'undefined') {
            const bsDropdown = (window as any).bootstrap.Dropdown.getInstance(toggleButton);
            if (bsDropdown) {
              bsDropdown.hide();
            }
          }
        }
      });
    }
  }

  ngOnDestroy(): void {}
}
