import {Component, computed, effect, EventEmitter, inject, Input, Output} from '@angular/core';
import {ModalService} from './modal.service';

@Component({
  selector: 'lib-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class Modal {
  private modalService = inject(ModalService);

  @Input() size: 'sm' | 'default' | 'lg' | 'xl' | 'fullscreen' = 'default';
  @Input() centered = false;
  @Input() scrollable = false;
  @Input() backdrop: boolean | 'static' = true;
  @Input() keyboard = true;
  @Input() showHeader = true;
  @Input() showFooter = false;
  @Input() showCloseButton = true;
  @Input() closeLabel = 'Close';
  @Input() ariaLabelledby?: string;
  @Input() headerClass = '';
  @Input() bodyClass = '';
  @Input() footerClass = '';

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = computed(() => this.modalService.isOpen());
  config = computed(() => this.modalService.config());

  modalDialogClasses = computed(() => {
    const classes: string[] = ['modal-dialog'];

    const finalSize = this.size || this.config().size || 'default';
    const finalCentered = this.centered || this.config().centered || false;
    const finalScrollable = this.scrollable || this.config().scrollable || false;

    if (finalSize === 'sm') classes.push('modal-sm');
    else if (finalSize === 'lg') classes.push('modal-lg');
    else if (finalSize === 'xl') classes.push('modal-xl');
    else if (finalSize === 'fullscreen') classes.push('modal-fullscreen');

    if (finalCentered) classes.push('modal-dialog-centered');
    if (finalScrollable) classes.push('modal-dialog-scrollable');

    return classes.join(' ');
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
    this.modalService.open({
      size: this.size,
      centered: this.centered,
      scrollable: this.scrollable,
      backdrop: this.backdrop,
      keyboard: this.keyboard,
      data
    });
  }

  close(): void {
    this.modalService.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal')) {
      const backdrop = this.config().backdrop ?? this.backdrop;
      if (backdrop !== 'static') {
        this.close();
      }
    }
  }

  private handleOpen(): void {
    document.body.classList.add('modal-open');
    this.handleKeydown();
  }

  private handleClose(): void {
    document.body.classList.remove('modal-open');
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
