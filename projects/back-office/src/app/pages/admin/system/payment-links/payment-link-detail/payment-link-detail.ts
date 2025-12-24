import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  PermissionService,
  ToastService,
  ConfirmDialogService
} from 'shared-lib';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { BillingService } from '../../../../../core/services/admin/billing.service';
import {
  PaymentLink,
  PaymentLinkStatus
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-payment-link-detail',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    DatePipe
  ],
  templateUrl: './payment-link-detail.html',
  styleUrl: './payment-link-detail.css'
})
export class PaymentLinkDetail implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  private destroy$ = new Subject<void>();

  paymentLink = signal<PaymentLink | null>(null);
  loading = signal(true);
  documentId = signal<string>('');

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'delete')
  );

  statusBadgeClass = computed(() => {
    const link = this.paymentLink();
    if (!link) return '';

    const classes: Record<PaymentLinkStatus, string> = {
      active: 'bg-success-subtle text-success',
      used: 'bg-info-subtle text-info',
      expired: 'bg-danger-subtle text-danger',
      cancelled: 'bg-secondary-subtle text-secondary'
    };

    return classes[link.link_status] || 'bg-secondary-subtle text-secondary';
  });

  isExpired = computed(() => {
    const link = this.paymentLink();
    if (!link) return false;
    return new Date(link.expires_at) < new Date();
  });

  publicUrl = computed(() => {
    const link = this.paymentLink();
    if (!link) return '';
    return `${window.location.origin}/payment/${link.link_token}`;
  });

  ngOnInit(): void {
    this.documentId.set(this.route.snapshot.paramMap.get('documentId') || '');

    if (!this.documentId()) {
      this.router.navigate(['/admin/system/billing/payment-links']);
      return;
    }

    this.loadPaymentLink();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setBreadcrumbs();
        this.updatePageTitle();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadPaymentLink(): void {
    this.loading.set(true);

    this.billingService.getPaymentLink(this.documentId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.paymentLink.set(response.data);
          this.setBreadcrumbs();
          this.updatePageTitle();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading payment link:', err);
          this.toastService.showError(
            this.translate.instant('payment-link-detail.error.load_failed')
          );
          this.loading.set(false);
          this.router.navigate(['/admin/system/billing/payment-links']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const link = this.paymentLink();
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.payment-link-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.payment-link-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.payment-link-detail.payment_links'),
        route: '/admin/system/billing/payment-links'
      },
      {
        label: link?.customer_name || this.translate.instant('breadcrumbs.payment-link-detail.detail'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    const link = this.paymentLink();
    this.pageTitleService.setTitle(
       this.translate.instant('header.pages.admin.system.payment-link-detail')
    );
  }

  copyLinkToClipboard(): void {
    const url = this.publicUrl();
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.showSuccess(
        this.translate.instant('payment-link-detail.toast.link_copied')
      );
    }).catch(() => {
      this.toastService.showError(
        this.translate.instant('payment-link-detail.toast.link_copy_error')
      );
    });
  }

  openPublicLink(): void {
    window.open(this.publicUrl(), '_blank');
  }

  deletePaymentLink(): void {
    if (!this.canDelete()) return;

    const link = this.paymentLink();
    if (!link) return;

    this.confirmDialog.confirmDelete(link.customer_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePaymentLink(this.documentId())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('payment-link-detail.toast.delete_success')
              );
              this.router.navigate(['/admin/system/billing/payment-links']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('payment-link-detail.toast.delete_error')
              );
            }
          });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/payment-links']);
  }
}
