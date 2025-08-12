import { Component, inject, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService, Toast } from './toast.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, NgbToastModule],
  template: `
    @for (toast of toasts; track toast.id) {
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
  `,
  styles: [`
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1200;
      max-width: 400px;
    }

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
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  @ViewChildren('toastRef') toastRefs!: QueryList<ElementRef>;

  toasts: Toast[] = [];

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        const previousCount = this.toasts.length;
        this.toasts = toasts;

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
