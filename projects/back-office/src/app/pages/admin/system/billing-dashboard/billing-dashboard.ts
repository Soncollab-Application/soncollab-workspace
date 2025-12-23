import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  PermissionService,
  KpiCardComponent,
  KpiData,
} from 'shared-lib';
import { Breadcrumb } from '../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { BillingService } from '../../../../core/services/admin/billing.service';
import {
  SubscriptionLifecycleStats,
  SubscriptionUsageStats,
  InvoiceStats,
  PaymentLinkDashboard
} from '../../../../core/models/admin/billing';

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DecimalPipe
  ],
  templateUrl: './billing-dashboard.html',
  styleUrl: './billing-dashboard.css'
})
export class BillingDashboard implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  subscriptionStats = signal<SubscriptionLifecycleStats | null>(null);
  usageStats = signal<SubscriptionUsageStats | null>(null);
  invoiceStats = signal<InvoiceStats | null>(null);
  paymentLinkStats = signal<PaymentLinkDashboard | null>(null);

  loading = signal(true);

  canViewSubscriptions = computed(() =>
    this.permissionsService.hasPermission('subscription', 'subscription', 'find')
  );

  canViewInvoices = computed(() =>
    this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'find')
  );

  canViewPaymentLinks = computed(() =>
    this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'find')
  );

  // KPIs Subscriptions
  subscriptionKpis = computed<KpiData[]>(() => {
    const stats = this.subscriptionStats();
    if (!stats) return [];

    return [
      {
        label: this.translate.instant('billing-dashboard.subscriptions.total'),
        value: stats.total || 0,
        icon: 'subscriptions',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.subscriptions.active'),
        value: stats.active || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.subscriptions.trial'),
        value: stats.trial || 0,
        icon: 'schedule',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.subscriptions.expiring_soon'),
        value: stats.expiring_soon || 0,
        icon: 'warning',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      }
    ];
  });

  // KPIs Invoices
  invoiceKpis = computed<KpiData[]>(() => {
    const stats = this.invoiceStats();
    if (!stats) return [];

    return [
      {
        label: this.translate.instant('billing-dashboard.invoices.total_revenue'),
        value: `$${(stats.total_revenue || 0).toLocaleString()}`,
        icon: 'attach_money',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.invoices.paid'),
        value: stats.by_status?.paid || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.invoices.total'),
        value: stats.total_invoices || 0,
        icon: 'receipt',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.invoices.overdue'),
        value: stats.overdue_count || 0,
        icon: 'error',
        iconClass: 'text-danger',
        bgClass: 'bg-danger bg-opacity-10'
      }
    ];
  });

  // KPIs Payment Links
  paymentLinkKpis = computed<KpiData[]>(() => {
    const stats = this.paymentLinkStats();
    if (!stats?.summary) return [];

    const summary = stats.summary;
    return [
      {
        label: this.translate.instant('billing-dashboard.payment_links.total'),
        value: summary.total_links || 0,
        icon: 'link',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.payment_links.converted'),
        value: summary.converted_links || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.payment_links.conversion_rate'),
        value: summary.conversion_rate || '0%',
        icon: 'trending_up',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('billing-dashboard.payment_links.avg_deal'),
        value: `$${(summary.avg_deal_size || 0).toLocaleString()}`,
        icon: 'attach_money',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      }
    ];
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.loadAllStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadAllStats(): void {
    this.loading.set(true);

    const requests: any = {};

    if (this.canViewSubscriptions()) {
      requests.subscriptions = this.billingService.getSubscriptionLifecycleStats();
      requests.usage = this.billingService.getSubscriptionUsageStats();
    }

    if (this.canViewInvoices()) {
      requests.invoices = this.billingService.getInvoiceStats();
    }

    if (this.canViewPaymentLinks()) {
      requests.paymentLinks = this.billingService.getPaymentLinkDashboard('30d');
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any) => {
          if (results.subscriptions) {
            this.subscriptionStats.set(results.subscriptions.data);
          }
          if (results.usage) {
            this.usageStats.set(results.usage.data);
          }
          if (results.invoices) {
            this.invoiceStats.set(results.invoices.data);
          }
          if (results.paymentLinks) {
            this.paymentLinkStats.set(results.paymentLinks.data);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading dashboard stats:', err);
          this.loading.set(false);
        }
      });
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.billing-dashboard.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.billing-dashboard.system')
      },
      {
        label: this.translate.instant('breadcrumbs.billing-dashboard.billing'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.billing-dashboard')
    );
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
