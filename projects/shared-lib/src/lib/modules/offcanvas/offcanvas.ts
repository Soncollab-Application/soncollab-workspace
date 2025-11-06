import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OffcanvasService } from './offcanvas.service';

@Component({
  selector: 'lib-offcanvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offcanvas.html',
  styleUrl: './offcanvas.css'
})
export class Offcanvas {
  private offcanvasService = inject(OffcanvasService);

  @Input() placement: 'start' | 'end' | 'top' | 'bottom' = 'end';
  @Input() backdrop: boolean | 'static' = true;
  @Input() keyboard = true;
  @Input() scroll = false;
  @Input() showHeader = true;
  @Input() showCloseButton = true;
  @Input() closeLabel = 'Close';
  @Input() ariaLabelledby?: string;
  @Input() headerClass = '';
  @Input() bodyClass = '';
  @Input() footerClass = '';
  @Input() hasFooter = false;

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = computed(() => this.offcanvasService.isOpen());
  config = computed(() => this.offcanvasService.config());

  offcanvasClasses = computed(() => {
    const placement = this.config().placement || this.placement;
    return `offcanvas-${placement}`;
  });

  showBackdrop = computed(() => {
    const backdrop = this.config().backdrop ?? this.backdrop;
    return backdrop !== false;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.handleKeydown();
        this.opened.emit();
      } else {
        this.closed.emit();
      }
    });
  }

  open(data?: any): void {
    this.offcanvasService.open({
      placement: this.placement,
      backdrop: this.backdrop,
      keyboard: this.keyboard,
      scroll: this.scroll,
      data
    });
  }

  close(): void {
    this.offcanvasService.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('offcanvas') || target.classList.contains('offcanvas-backdrop')) {
      const backdrop = this.config().backdrop ?? this.backdrop;
      if (backdrop !== 'static') {
        this.close();
      }
    }
  }

  private handleKeydown(): void {
    if (!this.keyboard && !this.config().keyboard) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handler);
      }
    };

    document.addEventListener('keydown', handler);
  }
}
