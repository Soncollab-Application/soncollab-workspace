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
  InvoiceListItem,
  InvoiceFilters,
  InvoiceStatus,
  InvoiceStats
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DataList
  ],
  templateUrl: './invoices-list.html',
  styleUrl: './invoices-list.css',
  providers: [ListStateManager]
})
export class InvoicesList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<InvoiceListItem, InvoiceFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'invoices-list';

  canFind = computed(() => this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('subscription-invoice', 'subscription-invoice', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<InvoiceListItem>[]>([]);
  actions = signal<ListAction<InvoiceListItem>[]>([]);

  stats = signal<InvoiceStats | null>(null);
  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    if (!statsData) return [];

    let mainCurrency = 'EUR';
    if (statsData.by_currency && Object.keys(statsData.by_currency).length > 0) {
      const currencies = Object.entries(statsData.by_currency);
      if (currencies.length > 0) {
        mainCurrency = currencies.reduce((prev, curr) =>
          curr[1].total > prev[1].total ? curr : prev
        )[0];
      }
    }

    return [
      {
        label: this.translate.instant('invoices-list.kpi.total_revenue'),
        value: `${(statsData.total_revenue || 0).toLocaleString()} ${mainCurrency}`,
        icon: 'universal_currency_alt',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('invoices-list.kpi.total'),
        value: statsData.total_invoices || 0,
        icon: 'receipt',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('invoices-list.kpi.avg_amount'),
        value: `${(statsData.avg_invoice_amount || 0).toLocaleString()} ${mainCurrency}`,
        icon: 'analytics',
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
        this.loadInvoices(page, pageSize, filters, sortField, sortDirection),
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
    this.billingService.getInvoiceStats()
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
    this.emptyTitle.set(this.translate.instant('invoices-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('invoices-list.empty.message'));

    this.filters.set([
      {
        key: 'invoice_status',
        type: 'select',
        label: this.translate.instant('invoices-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'draft', label: this.translate.instant('invoices-list.status.draft') },
          { value: 'sent', label: this.translate.instant('invoices-list.status.sent') },
          { value: 'paid', label: this.translate.instant('invoices-list.status.paid') },
          { value: 'overdue', label: this.translate.instant('invoices-list.status.overdue') },
          { value: 'cancelled', label: this.translate.instant('invoices-list.status.cancelled') }
        ]
      },
      {
        key: 'invoice_type',
        type: 'select',
        label: this.translate.instant('invoices-list.filters.type'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'subscription', label: this.translate.instant('invoices-list.type.subscription') },
          { value: 'addon', label: this.translate.instant('invoices-list.type.addon') },
          { value: 'upgrade', label: this.translate.instant('invoices-list.type.upgrade') },
          { value: 'refund', label: this.translate.instant('invoices-list.type.refund') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('invoices-list.sort.newest') },
      { value: 'invoice_date:desc', label: this.translate.instant('invoices-list.sort.date_desc') },
      { value: 'total_amount:desc', label: this.translate.instant('invoices-list.sort.amount_high') },
      { value: 'invoice_number:asc', label: this.translate.instant('invoices-list.sort.number') }
    ]);

    this.columns.set([
      {
        key: 'invoice_number',
        label: this.translate.instant('invoices-list.columns.invoice_number'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'customer',
        label: this.translate.instant('invoices-list.columns.customer'),
        sortable: false,
        type: 'text',
        render: (row: InvoiceListItem) => row.customer_name || row.customer_email || '-'
      },
      {
        key: 'invoice_type',
        label: this.translate.instant('invoices-list.columns.type'),
        sortable: true,
        type: 'text',
        render: (row: InvoiceListItem) =>
          this.translate.instant(`invoices-list.type.${row.invoice_type}`)
      },
      {
        key: 'total_amount',
        label: this.translate.instant('invoices-list.columns.amount'),
        sortable: true,
        type: 'text',
        render: (row: InvoiceListItem) => `${row.total_amount.toLocaleString()} ${row.currency}`
      },
      {
        key: 'invoice_date',
        label: this.translate.instant('invoices-list.columns.date'),
        sortable: true,
        type: 'text',
        render: (row: InvoiceListItem) => {
          const date = new Date(row.invoice_date);
          return date.toLocaleDateString('fr-FR');
        }
      },
      {
        key: 'invoice_status',
        label: this.translate.instant('invoices-list.columns.status'),
        type: 'custom-badge',
        render: (row: InvoiceListItem) =>
          this.translate.instant(`invoices-list.status.${row.invoice_status}`),
        cellClass: (row: InvoiceListItem) => this.getStatusBadgeClass(row.invoice_status),
        colspan: 2
      }
    ]);

    const baseActions: ListAction<InvoiceListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: InvoiceListItem) => this.viewInvoice(row)
      }
    ];

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: InvoiceListItem) => this.deleteInvoice(row)
      });
    }

    this.actions.set(baseActions);
  }

  private getStatusBadgeClass(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-secondary-subtle text-secondary',
      sent: 'bg-info-subtle text-info',
      paid: 'bg-success-subtle text-success',
      overdue: 'bg-danger-subtle text-danger',
      cancelled: 'bg-warning-subtle text-warning'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private buildFilters(search: string, filterValues: FilterValue): InvoiceFilters {
    const filters: InvoiceFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['invoice_status']) {
      filters.invoice_status = filterValues['invoice_status'] as InvoiceStatus;
    }

    if (filterValues['invoice_type']) {
      filters.invoice_type = filterValues['invoice_type'];
    }

    return filters;
  }

  private loadInvoices(
    page: number,
    pageSize: number,
    filters: InvoiceFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getInvoices(page, pageSize)
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
          console.error('Error loading invoices:', err);
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
        label: this.translate.instant('breadcrumbs.invoices-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.invoices-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.invoices-list.invoices'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.invoices-list')
    );
  }

  viewInvoice(invoice: InvoiceListItem): void {
    this.router.navigate(['/admin/system/billing/invoices', invoice.documentId]);
  }

  onRowClick(invoice: InvoiceListItem): void {
    this.viewInvoice(invoice);
  }

  deleteInvoice(invoice: InvoiceListItem): void {
    this.confirmDialog.confirmDelete(invoice.invoice_number).then((confirmed) => {
      if (confirmed) {
        this.toastService.showError(
          this.translate.instant('invoices-list.toast.delete_not_allowed')
        );
      }
    });
  }

  onActionClick(event: { action: ListAction<InvoiceListItem>; row: InvoiceListItem }): void {
    event.action.handler?.(event.row);
  }
}
