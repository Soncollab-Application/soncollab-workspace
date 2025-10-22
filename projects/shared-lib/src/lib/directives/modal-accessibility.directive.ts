import { Directive, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[libModalAccessibility]',
  standalone: true
})
export class ModalAccessibilityDirective {
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private observer?: MutationObserver;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initObserver();
      this.preventAriaHidden();
    }
  }

  private initObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement;

          // Retire immédiatement aria-hidden de app-root
          if (target.matches('app-root')) {
            target.removeAttribute('aria-hidden');
          }
        }
      });
    });

    this.observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-hidden'],
      childList: false
    });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
    });
  }

  private preventAriaHidden(): void {
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name: string, value: string) {
      if (name === 'aria-hidden' && this.tagName.toLowerCase() === 'app-root') {
        return;
      }
      originalSetAttribute.call(this, name, value);
    };
  }
}
