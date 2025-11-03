import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ListStateManager,
  FilterConfig,
  SortOption,
  ListColumn,
  ListAction,
  FilterValue,
  ListStateConfig,
  PermissionService,
  ToastService,
  FilterBarComponent,
  DataList,
  KpiCardComponent,
  KpiData
} from 'shared-lib';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
import {
  SalesQuota,
  QuotaFilters,
  QuotaStats,
  QuotaType
} from '../../../../../core/models/sales/sales-quota.model';
import { PageTitleService } from '../../../../../core/services/page-title.service';

@Component({
  selector: 'app-quotas-territories',
  imports: [
    Breadcrumb,
    FilterBarComponent,
    DataList,
    KpiCardComponent,
    TranslateModule
  ],
  providers: [ListStateManager],
  templateUrl: './quotas-territories.html',
  styleUrl: './quotas-territories.css'
})
export class QuotasTerritories implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
  private translate = inject(TranslateService);
  protected router = inject(Router);
  private permissionService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private toastService = inject(ToastService);

  protected listManager = inject(ListStateManager<SalesQuota, QuotaFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'quotas-territories-list';

  // Config
  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<SalesQuota>[]>([]);
  actions = signal<ListAction<SalesQuota>[]>([]);

  // Stats
  stats = signal<QuotaStats | null>(null);
  loadingStats = signal(false);
  kpiCards = signal<KpiData[]>([]);

  // Permissions
  canFindQuotas = computed(() =>
    this.permissionService.hasPermission('sales-quota', 'sales-quota', 'find')
  );
  canViewQuota = computed(() =>
    this.permissionService.hasPermission('sales-quota', 'sales-quota', 'findOne')
  );

  emptyTitle = signal(this.translate.instant('quotas-territories.empty.no_quotas'));
  emptyMessage = signal(this.translate.instant('quotas-territories.empty.no_quotas_message'));

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.initializeListManager();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.quotas-territories.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.quotas-territories.commercial')
      },
      {
        label: this.translate.instant('breadcrumbs.quotas-territories.quotas'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.commercial.quotas'));
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
      this.updateKpiCards();
    }, 150);
  }

  private initializeListManager(): void {
    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'desc' as const }
      : { field: 'createdAt', direction: 'desc' as const };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 25,
      onLanguageChange: () => this.onLanguageChange()
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildQuotaFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadQuotas(page, pageSize, filters, sortField, sortDirection),
      this.canFindQuotas
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'quota_type',
        type: 'select',
        label: this.translate.instant('quotas-territories.filters.type'),
        placeholder: this.translate.instant('quotas-territories.filters.allTypes'),
        options: this.getQuotaTypeOptions()
      },
      {
        key: 'is_active',
        type: 'select',
        label: this.translate.instant('quotas-territories.filters.status'),
        placeholder: this.translate.instant('quotas-territories.filters.allStatuses'),
        options: this.getStatusOptions()
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt', label: this.translate.instant('quotas-territories.sort.createdAt') },
      { value: 'priority_level', label: this.translate.instant('quotas-territories.sort.priority') },
      { value: 'max_contacts', label: this.translate.instant('quotas-territories.sort.capacity') },
      { value: 'current_contacts', label: this.translate.instant('quotas-territories.sort.assigned') }
    ]);

    this.columns.set([
      {
        key: 'sales_rep',
        label: this.translate.instant('quotas-territories.columns.sales_rep'),
        sortable: false,
        type: 'user',
        subtitleKey: 'sales_rep.email',
        render: (quota) => quota.sales_rep
          ? `${quota.sales_rep.first_name} ${quota.sales_rep.last_name}`
          : this.translate.instant('quotas-territories.columns.no_rep')
      },
      {
        key: 'quota_type',
        label: this.translate.instant('quotas-territories.columns.type'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (quota: SalesQuota) => this.getQuotaTypeBadgeClass(quota.quota_type),
        render: (quota) => this.translate.instant(`quotas-territories.badges.${quota.quota_type}`)
      },
      {
        key: 'max_contacts',
        label: this.translate.instant('quotas-territories.columns.capacity'),
        sortable: true,
        type: 'text',
        render: (quota) => quota.max_contacts.toString()
      },
      {
        key: 'current_contacts',
        label: this.translate.instant('quotas-territories.columns.assigned'),
        sortable: true,
        type: 'text',
        render: (quota) => `${quota.current_contacts} / ${quota.max_contacts}`
      },
      {
        key: 'utilization',
        label: this.translate.instant('quotas-territories.columns.utilization'),
        sortable: false,
        type: 'text',
        render: (quota) => {
          const percent = quota.max_contacts > 0
            ? Math.round((quota.current_contacts / quota.max_contacts) * 100)
            : 0;
          return `${percent}%`;
        }
      },
      {
        key: 'priority_level',
        label: this.translate.instant('quotas-territories.columns.priority'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (quota: SalesQuota) => this.getPriorityBadgeClass(quota.priority_level),
        render: (quota) => quota.priority_level.toString()
      },
      {
        key: 'is_active',
        label: this.translate.instant('quotas-territories.columns.status'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (quota: SalesQuota) => quota.is_active
          ? 'bg-success-subtle text-success'
          : 'bg-secondary-subtle text-secondary',
        render: (quota) => this.translate.instant(
          quota.is_active
            ? 'quotas-territories.badges.active'
            : 'quotas-territories.badges.inactive'
        )
      },
      {
        key: 'target_countries',
        label: this.translate.instant('quotas-territories.columns.countries'),
        sortable: false,
        type: 'text',
        render: (quota) => {
          if (!quota.target_countries || quota.target_countries.length === 0) {
            return this.translate.instant('quotas-territories.columns.no_countries');
          }

          if (quota.target_countries.length <= 3) {
            return quota.target_countries.map(c => c.name).join(', ');
          }

          const first3 = quota.target_countries.slice(0, 3).map(c => c.name).join(', ');
          const remaining = quota.target_countries.length - 3;
          return `${first3} +${remaining}`;
        },
        colspan: 2
      }
    ]);

    this.actions.set([
      {
        label: this.translate.instant('quotas-territories.actions.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (quota) => this.viewQuota(quota),
        condition: () => this.canViewQuota()
      }
    ]);

    this.emptyTitle.set(this.translate.instant('quotas-territories.empty.no_quotas'));
    this.emptyMessage.set(this.translate.instant('quotas-territories.empty.no_quotas_message'));
  }

  private getQuotaTypeOptions(): Array<{ value: QuotaType; label: string }> {
    const types: QuotaType[] = ['weekly', 'monthly'];
    return types.map(type => ({
      value: type,
      label: this.translate.instant(`quotas-territories.badges.${type}`)
    }));
  }

  private getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'true', label: this.translate.instant('quotas-territories.badges.active') },
      { value: 'false', label: this.translate.instant('quotas-territories.badges.inactive') }
    ];
  }

  private getQuotaTypeBadgeClass(type?: QuotaType): string {
    const classes: Record<QuotaType, string> = {
      weekly: 'bg-primary-subtle text-primary',
      monthly: 'bg-info-subtle text-info'
    };
    return type ? classes[type] : 'bg-secondary-subtle text-secondary';
  }

  private getPriorityBadgeClass(priority: number): string {
    if (priority >= 4) return 'bg-danger-subtle text-danger';
    if (priority === 3) return 'bg-warning-subtle text-warning';
    if (priority === 2) return 'bg-info-subtle text-info';
    return 'bg-secondary-subtle text-secondary';
  }

  private buildQuotaFilters(search: string, filterValues: FilterValue): QuotaFilters {
    const quotaFilters: QuotaFilters = {};

    if (search) {
      quotaFilters.search = search;
    }

    if (filterValues['quota_type']) {
      quotaFilters.quota_type = filterValues['quota_type'] as QuotaType;
    }

    if (filterValues['is_active'] !== undefined && filterValues['is_active'] !== '') {
      quotaFilters.is_active = filterValues['is_active'] === 'true';
    }

    return quotaFilters;
  }

  private loadQuotas(
    page: number,
    pageSize: number,
    filters: QuotaFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.adminSalesService.getQuotas(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading quotas:', err);
          this.listManager.setError();
        }
      });
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.adminSalesService.getQuotaStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats.set(response.data);
          this.updateKpiCards();
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats.set(false);
        }
      });
  }

  private updateKpiCards(): void {
    const stats = this.stats();
    if (!stats) return;

    // Calculer la capacité totale et l'assignation totale
    let totalCapacity = 0;
    let totalCurrent = 0;
    Object.values(stats.quotas_by_territory).forEach(territory => {
      totalCapacity += territory.total_capacity;
      totalCurrent += territory.total_current;
    });

    this.kpiCards.set([
      {
        label: this.translate.instant('quotas-territories.kpi.total_reps'),
        value: stats.total_reps.toString(),
        icon: 'group'
      },
      {
        label: this.translate.instant('quotas-territories.kpi.total_capacity'),
        value: totalCapacity.toString(),
        icon: 'inventory'
      },
      {
        label: this.translate.instant('quotas-territories.kpi.total_assigned'),
        value: totalCurrent.toString(),
        icon: 'assignment_turned_in'
      },
      {
        label: this.translate.instant('quotas-territories.kpi.avg_load'),
        value: `${stats.avg_load_percentage}%`,
        icon: 'analytics'
      },
      {
        label: this.translate.instant('quotas-territories.kpi.low_load'),
        value: stats.load_distribution.low_load.toString(),
        icon: 'trending_down'
      },
      {
        label: this.translate.instant('quotas-territories.kpi.overloaded'),
        value: stats.load_distribution.overloaded.toString(),
        icon: 'warning'
      }
    ]);
  }

  onActionClick(event: { action: ListAction<SalesQuota>; row: SalesQuota }): void {
    event.action.handler(event.row);
  }

  onRowClick(quota: SalesQuota): void {
    if (this.canViewQuota()) {
      this.viewQuota(quota);
    }
  }

  viewQuota(quota: SalesQuota): void {
    this.router.navigate(['/admin/commercial/quotas', quota.documentId]);
  }
}
