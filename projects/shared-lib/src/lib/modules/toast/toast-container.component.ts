import { Component, inject, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService, Toast, ToastPosition } from './toast.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'shared-toast-container',
  standalone: true,
  imports: [CommonModule, NgbToastModule],
  template: `
    @for (position of activePositions; track position) {
      <div
        [class]="getPositionClass(position)"
        class="toast-container-position shadow-lg">

        @for (toast of getToastsByPosition(position); track toast.id) {
          <ngb-toast
            #toastRef
            [class]="getToastClass(toast.type)"
            [autohide]="toast.autohide ?? true"
            [delay]="toast.delay ?? 5000"
            [animation]="true"
            (hidden)="onToastHidden(toast.id)">

            <ng-template ngbToastHeader>
              <i [class]="getIconClass(toast.type)" class="me-2"></i>
              <strong class="me-auto">{{ toast.header }}</strong>
            </ng-template>

            {{ toast.body }}
          </ngb-toast>
        }
      </div>
    }
  `,
  styles: [`
    .toast-container-position {
      position: fixed;
      z-index: 1200;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }

    .toast-container-position > * {
      pointer-events: auto;
    }

    /* Positions Top */
    .position-top-start {
      top: 20px;
      left: 20px;
    }

    .position-top-center {
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
    }

    .position-top-end {
      top: 20px;
      right: 20px;
    }

    /* Positions Middle */
    .position-middle-start {
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
    }

    .position-middle-center {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .position-middle-end {
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
    }

    /* Positions Bottom */
    .position-bottom-start {
      bottom: 20px;
      left: 20px;
      flex-direction: column-reverse;
    }

    .position-bottom-center {
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      flex-direction: column-reverse;
    }

    .position-bottom-end {
      bottom: 20px;
      right: 20px;
      flex-direction: column-reverse;
    }

    /* Toast Styles */
    .toast-success {
      --bs-toast-bg: var(--bs-success-bg-subtle);
      --bs-toast-border-color: var(--bs-success-border-subtle);
      --bs-toast-header-bg: var(--bs-success-bg-subtle);
      --bs-toast-header-border-color: var(--bs-success-border-subtle);
    }

    .toast-error {
      --bs-toast-bg: var(--bs-danger-bg-subtle);
      --bs-toast-border-color: var(--bs-danger-border-subtle);
      --bs-toast-header-bg: var(--bs-danger-bg-subtle);
      --bs-toast-header-border-color: var(--bs-danger-border-subtle);
    }

    .toast-warning {
      --bs-toast-bg: var(--bs-warning-bg-subtle);
      --bs-toast-border-color: var(--bs-warning-border-subtle);
      --bs-toast-header-bg: var(--bs-warning-bg-subtle);
      --bs-toast-header-border-color: var(--bs-warning-border-subtle);
    }

    .toast-info {
      --bs-toast-bg: var(--bs-info-bg-subtle);
      --bs-toast-border-color: var(--bs-info-border-subtle);
      --bs-toast-header-bg: var(--bs-info-bg-subtle);
      --bs-toast-header-border-color: var(--bs-info-border-subtle);
    }

    /* Responsive */
    @media (max-width: 576px) {
      .toast-container-position {
        max-width: calc(100vw - 40px);
        left: 20px !important;
        right: 20px !important;
        transform: none !important;
      }

      .position-top-center,
      .position-middle-center,
      .position-bottom-center {
        left: 20px !important;
        transform: none !important;
      }

      .position-middle-start,
      .position-middle-center,
      .position-middle-end {
        top: 20px !important;
        transform: none !important;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  @ViewChildren('toastRef') toastRefs!: QueryList<ElementRef>;

  toasts: Toast[] = [];
  activePositions: ToastPosition[] = [];

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        const previousCount = this.toasts.length;
        this.toasts = toasts;
        this.activePositions = this.toastService.getActivePositions();

        // Si de nouveaux toasts ont été ajoutés, les afficher
        if (toasts.length > previousCount) {
          setTimeout(() => {
            this.toastRefs.last?.nativeElement?.show?.();
          }, 0);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToastHidden(toastId: string): void {
    this.toastService.remove(toastId);
  }

  getToastsByPosition(position: ToastPosition): Toast[] {
    return this.toastService.getToastsByPosition(position);
  }

  getPositionClass(position: ToastPosition): string {
    return `position-${position}`;
  }

  getToastClass(type: Toast['type']): string {
    return `toast-${type}`;
  }

  getIconClass(type: Toast['type']): string {
    const icons = {
      success: 'bi bi-check-circle-fill text-success',
      error: 'bi bi-exclamation-triangle-fill text-danger',
      warning: 'bi bi-exclamation-triangle-fill text-warning',
      info: 'bi bi-info-circle-fill text-info'
    };
    return icons[type];
  }
}
