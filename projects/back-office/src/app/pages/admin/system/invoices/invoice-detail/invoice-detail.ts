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
import { Invoice, InvoiceStatus } from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    DatePipe,
  ],
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.css'
})
export class InvoiceDetail implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  private destroy$ = new Subject<void>();

  invoice = signal<Invoice | null>(null);
  loading = signal(true);
  documentId = signal<string>('');

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'delete')
  );

  statusBadgeClass = computed(() => {
    const inv = this.invoice();
    if (!inv) return '';

    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-secondary-subtle text-secondary',
      sent: 'bg-info-subtle text-info',
      paid: 'bg-success-subtle text-success',
      overdue: 'bg-danger-subtle text-danger',
      cancelled: 'bg-warning-subtle text-warning'
    };

    return classes[inv.invoice_status] || 'bg-secondary-subtle text-secondary';
  });

  customerName = computed(() => {
    const inv = this.invoice();
    if (!inv) return '';
    return inv.customer_details?.name || inv.customer_details?.email || '-';
  });

  customerEmail = computed(() => {
    const inv = this.invoice();
    if (!inv) return '';
    return inv.customer_details?.email || '-';
  });

  subscriberInfo = computed(() => {
    const inv = this.invoice();
    if (!inv?.subscription) return null;

    const sub = inv.subscription;
    if (sub.subscriber_user) {
      return {
        type: 'user',
        name: sub.subscriber_user.username || sub.subscriber_user.email,
        email: sub.subscriber_user.email
      };
    }
    if (sub.subscriber_team) {
      return {
        type: 'team',
        name: sub.subscriber_team.team_name,
        email: null
      };
    }
    return null;
  });

  ngOnInit(): void {
    this.documentId.set(this.route.snapshot.paramMap.get('documentId') || '');

    if (!this.documentId()) {
      this.router.navigate(['/admin/system/billing/invoices']);
      return;
    }

    this.loadInvoice();

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

  private loadInvoice(): void {
    this.loading.set(true);

    this.billingService.getInvoice(this.documentId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.invoice.set(response.data);
          this.setBreadcrumbs();
          this.updatePageTitle();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading invoice:', err);
          this.toastService.showError(
            this.translate.instant('invoice-detail.error.load_failed')
          );
          this.loading.set(false);
          this.router.navigate(['/admin/system/billing/invoices']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const invoiceNumber = this.invoice()?.invoice_number || '';
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.invoice-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.invoice-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.invoice-detail.invoices'),
        route: '/admin/system/billing/invoices'
      },
      {
        label: invoiceNumber,
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.invoice-detail')
    );
  }

  deleteInvoice(): void {
    if (!this.canDelete()) return;

    const inv = this.invoice();
    if (!inv) return;

    this.confirmDialog.confirmDelete(inv.invoice_number).then((confirmed) => {
      if (confirmed) {
        this.toastService.showError(
          this.translate.instant('invoice-detail.toast.delete_not_allowed')
        );
      }
    });
  }

  downloadPDF(): void {
    const inv = this.invoice();
    if (!inv?.pdf_file?.url) {
      this.toastService.showError(
        this.translate.instant('invoice-detail.toast.pdf_not_available')
      );
      return;
    }

    window.open(inv.pdf_file.url, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/invoices']);
  }
}
