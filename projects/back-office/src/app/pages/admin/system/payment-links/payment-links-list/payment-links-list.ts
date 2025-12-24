import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {
  FilterBarComponent,
  FilterConfig,
  FilterValue,
  PermissionService,
  SortOption,
  ConfirmDialogService,
  ToastService,
  KpiCardComponent,
  KpiData,
  ListStateManager,
  ListStateConfig,
  DataList,
  ListColumn,
  ListAction,
} from 'shared-lib';
import { BillingService } from '../../../../../core/services/admin/billing.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import {
  PaymentLinkFilters,
  PaymentLinkListItem,
  PaymentLinkStatus,
  PaymentLinkDashboard
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-payment-links-list',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DataList
  ],
  templateUrl: './payment-links-list.html',
  styleUrl: './payment-links-list.css',
  providers: [ListStateManager]
})
export class PaymentLinksList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<PaymentLinkListItem, PaymentLinkFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'payment-links-list';

  canFind = computed(() => this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('subscription-payment-link', 'subscription-payment-link', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<PaymentLinkListItem>[]>([]);
  actions = signal<ListAction<PaymentLinkListItem>[]>([]);

  dashboardStats = signal<PaymentLinkDashboard | null>(null);
  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const stats = this.dashboardStats();
    if (!stats?.metrics) return [];

    const metrics = stats.metrics;
    return [
      {
        label: this.translate.instant('payment-links-list.kpi.total'),
        value: metrics.total_links || 0,
        icon: 'link',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('payment-links-list.kpi.active'),
        value: metrics.active_links || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('payment-links-list.kpi.converted'),
        value: metrics.converted_links || 0,
        icon: 'shopping_cart',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('payment-links-list.kpi.conversion_rate'),
        value: metrics.conversion_rate || '0%',
        icon: 'trending_up',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      }
    ];
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.loadStats();

    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value.split(':')[0], direction: 'desc' as const }
      : { field: 'createdAt', direction: 'desc' as const };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort,
      pageSize: 10,
      onLanguageChange: () => this.onLanguageChange()
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) =>
        this.loadPaymentLinks(page, pageSize, filters, sortField, sortDirection),
      this.canFind
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.billingService.getPaymentLinkDashboard('30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dashboardStats.set(response.data);
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats.set(false);
        }
      });
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'link_status',
        type: 'select',
        label: this.translate.instant('payment-links-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'active', label: this.translate.instant('payment-links-list.status.active') },
          { value: 'used', label: this.translate.instant('payment-links-list.status.used') },
          { value: 'expired', label: this.translate.instant('payment-links-list.status.expired') },
          { value: 'cancelled', label: this.translate.instant('payment-links-list.status.cancelled') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('payment-links-list.sort.newest') },
      { value: 'expires_at:asc', label: this.translate.instant('payment-links-list.sort.expiring_soon') },
      { value: 'customer_name:asc', label: this.translate.instant('payment-links-list.sort.customer') },
      { value: 'total_amount:desc', label: this.translate.instant('payment-links-list.sort.amount') }
    ]);

    this.columns.set([
      {
        key: 'customer_name',
        label: this.translate.instant('payment-links-list.columns.customer'),
        sortable: true,
        type: 'text',
        render: (row: PaymentLinkListItem) => {
          return (row as any).customer_name || row.customer_email || '-';
        }
      },
      {
        key: 'plan_name',
        label: this.translate.instant('payment-links-list.columns.plan'),
        sortable: false,
        type: 'text',
        render: (row: PaymentLinkListItem) => {
          return (row as any).plan_details?.name || row.plan_name || '-';
        }
      },
      {
        key: 'total_amount',
        label: this.translate.instant('payment-links-list.columns.amount'),
        sortable: true,
        type: 'text',
        render: (row: PaymentLinkListItem) => `${row.total_amount} ${row.currency}`
      },
      {
        key: 'expires_at',
        label: this.translate.instant('payment-links-list.columns.expires_at'),
        sortable: true,
        type: 'text',
        render: (row: PaymentLinkListItem) => {
          const date = new Date(row.expires_at);
          return date.toLocaleDateString('fr-FR');
        }
      },
      {
        key: 'link_status',
        label: this.translate.instant('payment-links-list.columns.status'),
        type: 'custom-badge',
        render: (row: PaymentLinkListItem) =>
          this.translate.instant(`payment-links-list.status.${row.link_status}`),
        cellClass: (row: PaymentLinkListItem) => this.getStatusBadgeClass(row.link_status),
        colspan: 2
      }
    ]);

    const baseActions: ListAction<PaymentLinkListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: PaymentLinkListItem) => this.viewPaymentLink(row)
      }
    ];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('payment-links-list.actions.copy_link'),
        icon: 'content_copy',
        class: 'btn-outline-info',
        handler: (row: PaymentLinkListItem) => this.copyLink(row),
        condition: (row: PaymentLinkListItem) => row.link_status === 'active'
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: PaymentLinkListItem) => this.deletePaymentLink(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('payment-links-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('payment-links-list.empty.message'));
  }

  private getStatusBadgeClass(status: PaymentLinkStatus): string {
    const classes: Record<PaymentLinkStatus, string> = {
      active: 'bg-success-subtle text-success',
      used: 'bg-info-subtle text-info',
      expired: 'bg-danger-subtle text-danger',
      cancelled: 'bg-secondary-subtle text-secondary'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private buildFilters(search: string, filterValues: FilterValue): PaymentLinkFilters {
    const filters: PaymentLinkFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['link_status']) {
      filters.link_status = filterValues['link_status'] as PaymentLinkStatus;
    }

    return filters;
  }

  private loadPaymentLinks(
    page: number,
    pageSize: number,
    filters: PaymentLinkFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getPaymentLinks(page, pageSize, filters, sortField, sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.listManager.setData(
            response.data,
            response.meta.pagination.total,
            response.meta.pagination.pageCount
          );
        },
        error: (err) => {
          console.error('Error loading payment links:', err);
          this.listManager.setError();
        }
      });
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
    }, 150);
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.payment-links-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.payment-links-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.payment-links-list.payment_links'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.payment-links')
    );
  }

  onActionClick(event: { action: ListAction<PaymentLinkListItem>; row: PaymentLinkListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(paymentLink: PaymentLinkListItem): void {
    this.viewPaymentLink(paymentLink);
  }

  viewPaymentLink(paymentLink: PaymentLinkListItem): void {
    this.router.navigate(['/admin/system/billing/payment-links', paymentLink.documentId]);
  }

  copyLink(paymentLink: PaymentLinkListItem): void {
    const linkUrl = `${window.location.origin}/payment/${paymentLink.link_token}`;
    navigator.clipboard.writeText(linkUrl).then(() => {
      this.toastService.showSuccess(
        this.translate.instant('payment-links-list.toast.link_copied')
      );
    }).catch(() => {
      this.toastService.showError(
        this.translate.instant('payment-links-list.toast.link_copy_error')
      );
    });
  }

  deletePaymentLink(paymentLink: PaymentLinkListItem): void {
    if (!this.canDelete()) return;

    this.confirmDialog.confirmDelete(paymentLink.customer_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePaymentLink(paymentLink.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('payment-links-list.toast.delete_success', { name: paymentLink.customer_name })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('payment-links-list.toast.delete_error', { name: paymentLink.customer_name })
              );
            }
          });
      }
    });
  }
}
