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

  // CORRECTION: Priorité à l'Input placement, puis config
  offcanvasClasses = computed(() => {
    const finalPlacement = this.placement || this.config().placement || 'end';
    return `offcanvas-${finalPlacement}`;
  });

  showBackdrop = computed(() => {
    const backdrop = this.config().backdrop ?? this.backdrop;
    return backdrop !== false;
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.handleOpen();
        this.opened.emit();
      } else {
        this.handleClose();
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

  private handleOpen(): void {
    document.body.classList.add('offcanvas-open');
    this.handleKeydown();
  }

  private handleClose(): void {
    document.body.classList.remove('offcanvas-open');
  }

  private handleKeydown(): void {
    if (!this.keyboard && !this.config().keyboard) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isOpen()) {
        this.close();
        document.removeEventListener('keydown', handler);
      }
    };

    document.addEventListener('keydown', handler);
  }
}
