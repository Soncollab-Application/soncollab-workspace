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
import { BillingService } from '../../../../../core/services/admin/billing.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { Transaction, TransactionStatus } from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    DatePipe
  ],
  templateUrl: './transaction-detail.html',
  styleUrl: './transaction-detail.css'
})
export class TransactionDetail implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  private destroy$ = new Subject<void>();

  transaction = signal<Transaction | null>(null);
  loading = signal(true);
  documentId = signal<string>('');

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'delete')
  );

  statusBadgeClass = computed(() => {
    const tx = this.transaction();
    if (!tx) return '';

    const classes: Record<TransactionStatus, string> = {
      pending: 'bg-warning-subtle text-warning',
      processing: 'bg-info-subtle text-info',
      completed: 'bg-success-subtle text-success',
      failed: 'bg-danger-subtle text-danger',
      cancelled: 'bg-secondary-subtle text-secondary',
      refunded: 'bg-primary-subtle text-primary'
    };

    return classes[tx.transaction_status] || 'bg-secondary-subtle text-secondary';
  });

  hasInvoice = computed(() => {
    const tx = this.transaction();
    return tx?.subscription_invoice != null;
  });

  hasSubscription = computed(() => {
    const tx = this.transaction();
    return tx?.subscription != null;
  });

  ngOnInit(): void {
    this.documentId.set(this.route.snapshot.paramMap.get('documentId') || '');

    if (!this.documentId()) {
      this.router.navigate(['/admin/system/billing/transactions']);
      return;
    }

    this.loadTransaction();

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

  private loadTransaction(): void {
    this.loading.set(true);

    this.billingService.getTransaction(this.documentId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transaction.set(response.data);
          this.setBreadcrumbs();
          this.updatePageTitle();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading transaction:', err);
          this.toastService.showError(
            this.translate.instant('transaction-detail.error.load_failed')
          );
          this.loading.set(false);
          this.router.navigate(['/admin/system/billing/transactions']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const reference = this.transaction()?.transaction_reference || '';
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.transaction-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.transaction-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.transaction-detail.transactions'),
        route: '/admin/system/billing/transactions'
      },
      {
        label: reference,
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.transaction-detail')
    );
  }

  viewInvoice(): void {
    const tx = this.transaction();
    if (tx?.subscription_invoice?.documentId) {
      this.router.navigate(['/admin/system/billing/invoices', tx.subscription_invoice.documentId]);
    }
  }

  viewSubscription(): void {
    const tx = this.transaction();
    if (tx?.subscription?.documentId) {
      this.router.navigate(['/admin/system/billing/subscriptions', tx.subscription.documentId]);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/transactions']);
  }
}
