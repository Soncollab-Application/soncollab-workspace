import { Directive, input, effect, ElementRef, inject, Renderer2, OnDestroy, DestroyRef } from '@angular/core';

declare const bootstrap: any;

type TooltipPlacement = 'top' | 'right' | 'bottom' | 'left';

@Directive({
  selector: '[libTooltip]',
  standalone: true
})
export class TooltipDirective {
  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private tooltipInstance?: any;

  libTooltip = input.required<string>();
  tooltipPlacement = input<TooltipPlacement>('top');
  tooltipHtml = input<boolean>(false);
  tooltipSm = input<boolean>(false);

  constructor() {
    effect(() => {
      this.destroyTooltip();
      this.initTooltip();
    });

    this.destroyRef.onDestroy(() => {
      this.destroyTooltip();
    });
  }

  private initTooltip(): void {
    const title = this.libTooltip();
    if (!title) return;

    this.tooltipInstance = new bootstrap.Tooltip(this.el.nativeElement, {
      title: title,
      placement: this.tooltipPlacement(),
      html: this.tooltipHtml(),
      customClass: this.tooltipSm() ? 'tooltip-sm' : '',
      trigger: 'hover'
    });
  }

  private destroyTooltip(): void {
    if (this.tooltipInstance) {
      this.tooltipInstance.dispose();
      this.tooltipInstance = undefined;
    }
  }
}
