import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  FilterBarComponent,
  FilterConfig,
  FilterValue,
  LanguageOrchestratorService,
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
import {BillingService} from '../../../../../core/services/admin/billing.service';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {BillingPlanFilters, BillingPlanListItem, SupportLevel} from '../../../../../core/models/admin/billing';


@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [FilterBarComponent, Breadcrumb, TranslatePipe, KpiCardComponent, DataList],
  templateUrl: './plans-list.html',
  styleUrl: './plans-list.css',
  providers: [ListStateManager]
})
export class PlansList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<BillingPlanListItem, BillingPlanFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'plans-list';

  canFind = computed(() => this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<BillingPlanListItem>[]>([]);
  actions = signal<ListAction<BillingPlanListItem>[]>([]);

  stats = signal<any>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('plans-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'credit_card',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('plans-list.kpi.active'),
        value: statsData.active || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('plans-list.kpi.inactive'),
        value: statsData.inactive || 0,
        icon: 'cancel',
        iconClass: 'text-danger',
        bgClass: 'bg-danger bg-opacity-10'
      },
      {
        label: this.translate.instant('plans-list.kpi.revenue_potential'),
        value: `${statsData.total_revenue_potential || 0}€`,
        icon: 'euro',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      }
    ];
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();

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
        this.loadPlans(page, pageSize, filters, sortField, sortDirection),
      this.canFind
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'is_active',
        type: 'select',
        label: this.translate.instant('plans-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('plans-list.status.active') },
          { value: 'false', label: this.translate.instant('plans-list.status.inactive') }
        ]
      },
      {
        key: 'support_level',
        type: 'select',
        label: this.translate.instant('plans-list.filters.support_level'),
        placeholder: this.translate.instant('common.all'),
        options: this.getSupportLevelOptions()
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('plans-list.sort.newest') },
      { value: 'plan_name:asc', label: this.translate.instant('plans-list.sort.name') },
      { value: 'price_monthly:asc', label: this.translate.instant('plans-list.sort.price_asc') },
      { value: 'price_monthly:desc', label: this.translate.instant('plans-list.sort.price_desc') }
    ]);

    this.columns.set([
      {
        key: 'plan_name',
        label: this.translate.instant('plans-list.columns.name'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'product_type',
        label: this.translate.instant('plans-list.columns.product_type'),
        type: 'text',
        render: (row: BillingPlanListItem) => row.product_type_name || '-'
      },
      {
        key: 'price_monthly',
        label: this.translate.instant('plans-list.columns.price_monthly'),
        sortable: true,
        type: 'text',
        render: (row: BillingPlanListItem) => `${row.price_monthly}${row.currency_symbol || '€'}`
      },
      {
        key: 'price_yearly',
        label: this.translate.instant('plans-list.columns.price_yearly'),
        sortable: true,
        type: 'text',
        render: (row: BillingPlanListItem) => `${row.price_yearly}${row.currency_symbol || '€'}`
      },
      {
        key: 'support_level',
        label: this.translate.instant('plans-list.columns.support'),
        type: 'custom-badge',
        render: (row: BillingPlanListItem) => this.translateSupportLevel(row.support_level),
        cellClass: (row: BillingPlanListItem) => this.getSupportLevelClass(row.support_level)
      },
      {
        key: 'is_active',
        label: this.translate.instant('plans-list.columns.status'),
        type: 'custom-badge',
        render: (row: BillingPlanListItem) =>
          row.is_active
            ? this.translate.instant('plans-list.status.active')
            : this.translate.instant('plans-list.status.inactive'),
        cellClass: (row: BillingPlanListItem) =>
          row.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger',
        colspan: 2
      }
    ]);

    const baseActions: ListAction<BillingPlanListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: BillingPlanListItem) => this.viewPlan(row)
      }
    ];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('common.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (row: BillingPlanListItem) => this.editPlan(row)
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: BillingPlanListItem) => this.deletePlan(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('plans-list.no_plans'));
    this.emptyMessage.set(this.translate.instant('plans-list.no_plans_message'));
  }

  private buildFilters(search: string, filterValues: FilterValue): BillingPlanFilters {
    const filters: BillingPlanFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['is_active']) {
      filters.is_active = filterValues['is_active'] === 'true';
    }

    if (filterValues['support_level']) {
      filters.support_level = filterValues['support_level'] as SupportLevel;
    }

    return filters;
  }

  private loadPlans(
    page: number,
    pageSize: number,
    filters: BillingPlanFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getBillingPlans(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading plans:', err);
          this.listManager.setError();
        }
      });
  }

  private getSupportLevelOptions(): { value: SupportLevel; label: string }[] {
    const levels: SupportLevel[] = ['basic', 'priority', 'premium'];
    return levels.map(level => ({
      value: level,
      label: this.translate.instant(`plans-list.support_levels.${level}`)
    }));
  }

  private translateSupportLevel(level: SupportLevel): string {
    return this.translate.instant(`plans-list.support_levels.${level}`);
  }

  private getSupportLevelClass(level: SupportLevel): string {
    const classes = {
      basic: 'bg-secondary-subtle text-secondary',
      priority: 'bg-info-subtle text-info',
      premium: 'bg-warning-subtle text-warning'
    };
    return classes[level] || 'bg-secondary-subtle text-secondary';
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
      this.languageChange.update(v => v + 1);
    }, 150);
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.plans-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.plans-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.plans-list.billing')
      },
      {
        label: this.translate.instant('breadcrumbs.plans-list.plans'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.plans')
    );
  }

  onActionClick(event: { action: ListAction<BillingPlanListItem>; row: BillingPlanListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(plan: BillingPlanListItem): void {
    this.viewPlan(plan);
  }

  viewPlan(plan: BillingPlanListItem): void {
    this.router.navigate(['/admin/system/billing/plans', plan.documentId]);
  }

  editPlan(plan: BillingPlanListItem): void {
    console.log('Edit plan:', plan);
  }

  deletePlan(plan: BillingPlanListItem): void {
    if (!this.canDelete()) return;

    this.confirmDialog.confirmDelete(plan.plan_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteBillingPlan(plan.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('plans-list.toast.delete_success', { name: plan.plan_name })
              );
              this.listManager.reload();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('plans-list.toast.delete_error', { name: plan.plan_name })
              );
            }
          });
      }
    });
  }
}
