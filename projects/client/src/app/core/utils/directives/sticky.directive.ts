import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[dataStickyElement]',
  standalone: true
})
export class StickyDirective implements OnInit, OnDestroy {
  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        entry.target.classList.toggle('is-stuck', entry.intersectionRatio < 1);
      },
      {
        threshold: [1],
        rootMargin: '0px 0px 100% 0px'
      }
    );

    this.observer.observe(this.el.nativeElement);
  }
}
