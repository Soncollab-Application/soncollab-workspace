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
  TransactionListItem,
  TransactionFilters,
  TransactionStatus,
  TransactionType,
  TransactionStats
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DataList
  ],
  templateUrl: './transactions-list.html',
  styleUrl: './transactions-list.css',
  providers: [ListStateManager]
})
export class TransactionsList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<TransactionListItem, TransactionFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'transactions-list';

  canFind = computed(() => this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('subscription-transaction', 'subscription-transaction', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<TransactionListItem>[]>([]);
  actions = signal<ListAction<TransactionListItem>[]>([]);

  stats = signal<TransactionStats | null>(null);
  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    if (!statsData) return [];

    let mainCurrency = 'EUR';
    if (statsData.by_provider && Object.keys(statsData.by_provider).length > 0) {
      const providers = Object.entries(statsData.by_provider);
      if (providers.length > 0) {
        mainCurrency = providers[0][1].total ? 'EUR' : mainCurrency;
      }
    }

    return [
      {
        label: this.translate.instant('transactions-list.kpi.total_volume'),
        value: `${(statsData.total_volume || 0).toLocaleString()} ${mainCurrency}`,
        icon: 'payments',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('transactions-list.kpi.total'),
        value: statsData.total_transactions || 0,
        icon: 'receipt_long',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('transactions-list.kpi.success_rate'),
        value: statsData.success_rate || '0%',
        icon: 'check_circle',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
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
        this.loadTransactions(page, pageSize, filters, sortField, sortDirection),
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
    this.billingService.getTransactionStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats.set(response.data);
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats.set(false);
        }
      });
  }

  private initializeConfig(): void {
    this.emptyTitle.set(this.translate.instant('transactions-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('transactions-list.empty.message'));

    this.filters.set([
      {
        key: 'transaction_status',
        type: 'select',
        label: this.translate.instant('transactions-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'pending', label: this.translate.instant('transactions-list.status.pending') },
          { value: 'processing', label: this.translate.instant('transactions-list.status.processing') },
          { value: 'completed', label: this.translate.instant('transactions-list.status.completed') },
          { value: 'failed', label: this.translate.instant('transactions-list.status.failed') },
          { value: 'cancelled', label: this.translate.instant('transactions-list.status.cancelled') },
          { value: 'refunded', label: this.translate.instant('transactions-list.status.refunded') }
        ]
      },
      {
        key: 'transaction_type',
        type: 'select',
        label: this.translate.instant('transactions-list.filters.type'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'subscription_payment', label: this.translate.instant('transactions-list.type.subscription_payment') },
          { value: 'upgrade', label: this.translate.instant('transactions-list.type.upgrade') },
          { value: 'downgrade', label: this.translate.instant('transactions-list.type.downgrade') },
          { value: 'addon_purchase', label: this.translate.instant('transactions-list.type.addon_purchase') },
          { value: 'refund', label: this.translate.instant('transactions-list.type.refund') }
        ]
      },
      {
        key: 'payment_provider',
        type: 'select',
        label: this.translate.instant('transactions-list.filters.provider'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'stripe', label: 'Stripe' },
          { value: 'fedapay', label: 'FedaPay' }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('transactions-list.sort.newest') },
      { value: 'transaction_date:desc', label: this.translate.instant('transactions-list.sort.date_desc') },
      { value: 'amount:desc', label: this.translate.instant('transactions-list.sort.amount_high') },
      { value: 'transaction_reference:asc', label: this.translate.instant('transactions-list.sort.reference') }
    ]);

    this.columns.set([
      {
        key: 'transaction_reference',
        label: this.translate.instant('transactions-list.columns.reference'),
        sortable: true,
        type: 'text',
        render: (row: TransactionListItem) => row.transaction_reference
      },
      {
        key: 'customer',
        label: this.translate.instant('transactions-list.columns.customer'),
        sortable: false,
        type: 'text',
        render: (row: TransactionListItem) => row.customer_name || row.customer_email || '-'
      },
      {
        key: 'transaction_type',
        label: this.translate.instant('transactions-list.columns.type'),
        sortable: true,
        type: 'text',
        render: (row: TransactionListItem) =>
          this.translate.instant(`transactions-list.type.${row.transaction_type}`)
      },
      {
        key: 'amount',
        label: this.translate.instant('transactions-list.columns.amount'),
        sortable: true,
        type: 'text',
        render: (row: TransactionListItem) => `${row.amount.toLocaleString()} ${row.currency}`
      },
      {
        key: 'payment_provider',
        label: this.translate.instant('transactions-list.columns.provider'),
        sortable: true,
        type: 'text',
        render: (row: TransactionListItem) => row.payment_provider || '-'
      },
      {
        key: 'transaction_date',
        label: this.translate.instant('transactions-list.columns.date'),
        sortable: true,
        type: 'text',
        render: (row: TransactionListItem) => {
          const date = new Date(row.transaction_date);
          return date.toLocaleDateString('fr-FR');
        }
      },
      {
        key: 'transaction_status',
        label: this.translate.instant('transactions-list.columns.status'),
        type: 'custom-badge',
        render: (row: TransactionListItem) =>
          this.translate.instant(`transactions-list.status.${row.transaction_status}`),
        cellClass: (row: TransactionListItem) => this.getStatusBadgeClass(row.transaction_status),
        colspan: 2
      }
    ]);

    const baseActions: ListAction<TransactionListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: TransactionListItem) => this.viewTransaction(row)
      }
    ];

    this.actions.set(baseActions);
  }

  private getStatusBadgeClass(status: TransactionStatus): string {
    const classes: Record<TransactionStatus, string> = {
      pending: 'bg-warning-subtle text-warning',
      processing: 'bg-info-subtle text-info',
      completed: 'bg-success-subtle text-success',
      failed: 'bg-danger-subtle text-danger',
      cancelled: 'bg-secondary-subtle text-secondary',
      refunded: 'bg-primary-subtle text-primary'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private buildFilters(search: string, filterValues: FilterValue): TransactionFilters {
    const filters: TransactionFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['transaction_status']) {
      filters.transaction_status = filterValues['transaction_status'] as TransactionStatus;
    }

    if (filterValues['transaction_type']) {
      filters.transaction_type = filterValues['transaction_type'] as TransactionType;
    }

    if (filterValues['payment_provider']) {
      filters.payment_provider = filterValues['payment_provider'];
    }

    return filters;
  }

  private loadTransactions(
    page: number,
    pageSize: number,
    filters: TransactionFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getTransactions(page, pageSize)
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
          console.error('Error loading transactions:', err);
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
        label: this.translate.instant('breadcrumbs.transactions-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.transactions-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.transactions-list.transactions'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.transactions-list')
    );
  }

  viewTransaction(transaction: TransactionListItem): void {
    this.router.navigate(['/admin/system/billing/transactions', transaction.documentId]);
  }

  onRowClick(transaction: TransactionListItem): void {
    this.viewTransaction(transaction);
  }

  onActionClick(event: { action: ListAction<TransactionListItem>; row: TransactionListItem }): void {
    event.action.handler?.(event.row);
  }
}
