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
  SubscriptionFilters,
  SubscriptionListItem,
  SubscriptionStatus,
  BillingCycle,
  SubscriptionLifecycleStats
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DataList
  ],
  templateUrl: './subscriptions-list.html',
  styleUrl: './subscriptions-list.css',
  providers: [ListStateManager]
})
export class SubscriptionsList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<SubscriptionListItem, SubscriptionFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'subscriptions-list';

  canFind = computed(() => this.permissionsService.hasPermission('subscription', 'subscription', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('subscription', 'subscription', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('subscription', 'subscription', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('subscription', 'subscription', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<SubscriptionListItem>[]>([]);
  actions = signal<ListAction<SubscriptionListItem>[]>([]);

  stats = signal<SubscriptionLifecycleStats | null>(null);
  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('subscriptions-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'subscriptions',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('subscriptions-list.kpi.active'),
        value: statsData.active || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('subscriptions-list.kpi.trial'),
        value: statsData.trial || 0,
        icon: 'schedule',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('subscriptions-list.kpi.expiring_soon'),
        value: statsData.expiring_soon || 0,
        icon: 'warning',
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
        this.loadSubscriptions(page, pageSize, filters, sortField, sortDirection),
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
    this.billingService.getSubscriptionLifecycleStats()
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
    this.filters.set([
      {
        key: 'subscription_status',
        type: 'select',
        label: this.translate.instant('subscriptions-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'active', label: this.translate.instant('subscriptions-list.status.active') },
          { value: 'trial', label: this.translate.instant('subscriptions-list.status.trial') },
          { value: 'cancelled', label: this.translate.instant('subscriptions-list.status.cancelled') },
          { value: 'paused', label: this.translate.instant('subscriptions-list.status.paused') }
        ]
      },
      {
        key: 'billing_cycle',
        type: 'select',
        label: this.translate.instant('subscriptions-list.filters.billing_cycle'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'monthly', label: this.translate.instant('subscriptions-list.billing_cycle.monthly') },
          { value: 'yearly', label: this.translate.instant('subscriptions-list.billing_cycle.yearly') }
        ]
      },
      {
        key: 'subscriber_type',
        type: 'select',
        label: this.translate.instant('subscriptions-list.filters.subscriber_type'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'user', label: this.translate.instant('subscriptions-list.subscriber_type.user') },
          { value: 'team', label: this.translate.instant('subscriptions-list.subscriber_type.team') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('subscriptions-list.sort.newest') },
      { value: 'start_date:desc', label: this.translate.instant('subscriptions-list.sort.start_date') },
      { value: 'end_date:asc', label: this.translate.instant('subscriptions-list.sort.expiry_soon') },
      { value: 'subscriber_name:asc', label: this.translate.instant('subscriptions-list.sort.subscriber') }
    ]);

    this.columns.set([
      {
        key: 'subscriber_name',
        label: this.translate.instant('subscriptions-list.columns.subscriber'),
        sortable: true,
        type: 'text',
        render: (row: SubscriptionListItem) => {
          const icon = row.subscriber_type === 'team' ? '👥' : '👤';
          return `${icon} ${row.subscriber_name}`;
        }
      },
      {
        key: 'plan_name',
        label: this.translate.instant('subscriptions-list.columns.plan'),
        sortable: false,
        type: 'text'
      },
      {
        key: 'billing_cycle',
        label: this.translate.instant('subscriptions-list.columns.billing_cycle'),
        type: 'text',
        render: (row: SubscriptionListItem) =>
          this.translate.instant(`subscriptions-list.billing_cycle.${row.billing_cycle}`)
      },
      {
        key: 'end_date',
        label: this.translate.instant('subscriptions-list.columns.end_date'),
        sortable: true,
        type: 'text',
        render: (row: SubscriptionListItem) => {
          const date = new Date(row.end_date);
          return date.toLocaleDateString('fr-FR');
        }
      },
      {
        key: 'subscription_status',
        label: this.translate.instant('subscriptions-list.columns.status'),
        type: 'custom-badge',
        render: (row: SubscriptionListItem) =>
          this.translate.instant(`subscriptions-list.status.${row.subscription_status}`),
        cellClass: (row: SubscriptionListItem) => this.getStatusBadgeClass(row.subscription_status),
        colspan: 2
      }
    ]);

    const baseActions: ListAction<SubscriptionListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: SubscriptionListItem) => this.viewSubscription(row)
      }
    ];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('common.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (row: SubscriptionListItem) => this.editSubscription(row)
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: SubscriptionListItem) => this.deleteSubscription(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('subscriptions-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('subscriptions-list.empty.message'));
  }

  private getStatusBadgeClass(status: SubscriptionStatus): string {
    const classes: Record<SubscriptionStatus, string> = {
      active: 'bg-success-subtle text-success',
      trial: 'bg-info-subtle text-info',
      cancelled: 'bg-danger-subtle text-danger',
      paused: 'bg-warning-subtle text-warning'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private buildFilters(search: string, filterValues: FilterValue): SubscriptionFilters {
    const filters: SubscriptionFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['subscription_status']) {
      filters.subscription_status = filterValues['subscription_status'] as SubscriptionStatus;
    }

    if (filterValues['billing_cycle']) {
      filters.billing_cycle = filterValues['billing_cycle'] as BillingCycle;
    }

    if (filterValues['subscriber_type']) {
      filters.subscriber_type = filterValues['subscriber_type'] as 'user' | 'team';
    }

    return filters;
  }

  private loadSubscriptions(
    page: number,
    pageSize: number,
    filters: SubscriptionFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getSubscriptions(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading subscriptions:', err);
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
        label: this.translate.instant('breadcrumbs.subscriptions-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.subscriptions-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.subscriptions-list.subscriptions'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.subscriptions')
    );
  }

  onActionClick(event: { action: ListAction<SubscriptionListItem>; row: SubscriptionListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(subscription: SubscriptionListItem): void {
    this.viewSubscription(subscription);
  }

  viewSubscription(subscription: SubscriptionListItem): void {
    this.router.navigate(['/admin/system/billing/subscriptions', subscription.documentId]);
  }

  editSubscription(subscription: SubscriptionListItem): void {
    console.log('Edit subscription:', subscription);
  }

  deleteSubscription(subscription: SubscriptionListItem): void {
    if (!this.canDelete()) return;

    this.confirmDialog.confirmDelete(subscription.subscriber_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteSubscription(subscription.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('subscriptions-list.toast.delete_success', { name: subscription.subscriber_name })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('subscriptions-list.toast.delete_error', { name: subscription.subscriber_name })
              );
            }
          });
      }
    });
  }
}
