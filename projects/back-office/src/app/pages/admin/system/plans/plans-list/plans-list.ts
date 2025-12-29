import {Component, computed, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  Choice,
  ChoiceOption,
  ChoiceConfig,
} from 'shared-lib';
import { BillingService } from '../../../../../core/services/admin/billing.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import {
  BillingPlanFilters,
  BillingPlanListItem,
  SupportLevel,
  AVAILABLE_LOCALES
} from '../../../../../core/models/admin/billing';
import { TranslationsModal } from '../../../../../core/components/admin/modals/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/modals/translations-modal.service';
import {PlanOffcanvasService} from '../../../../../core/services/admin/offcanvas/plan-offcanvas.service';
import {PlanOffcanvas} from '../../../../../core/components/admin/offcanvas/plan-offcanvas/plan-offcanvas';
import {LocaleSelectorModalService} from '../../../../../core/services/admin/modals/locale-selector-modal.service';
import {LocaleSelectorModal} from '../../../../../core/components/admin/modals/locale-selector-modal/locale-selector-modal';

@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilterBarComponent,
    Breadcrumb,
    TranslatePipe,
    KpiCardComponent,
    DataList,
    Choice,
    TranslationsModal,
    PlanOffcanvas,
    LocaleSelectorModal
  ],
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
  private translationsModalService = inject(TranslationsModalService);
  private planOffcanvasService = inject(PlanOffcanvasService);
  private localeSelectorService = inject(LocaleSelectorModalService);



  private destroy$ = new Subject<void>();
  private componentId = 'plans-list';

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-billing-plans-locale';
  selectedLocale = signal<string>('fr');

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

  languageOptions = computed<ChoiceOption[]>(() =>
    this.availableLocales.map(locale => ({
      value: locale.code,
      label: `${locale.flag} ${locale.label}`,
    }))
  );

  languageConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false,
  };

  currentLocaleLabel = computed(() => {
    const locale = this.availableLocales.find(l => l.code === this.currentLocale());
    return locale ? `${locale.flag} ${locale.label}` : this.currentLocale().toUpperCase();
  });

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('plans-list.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
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
      }
    ];
  });

  constructor() {
    let wasOpen = false;

    effect(() => {
      const isOpen = this.planOffcanvasService.isOpen();

      if (wasOpen && !isOpen) {
        this.loadStats();
        this.listManager.reload();
      }

      wasOpen = isOpen;
    });
  }

  ngOnInit(): void {
    this.loadLocaleFromStorage();
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

    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadLocaleFromStorage(): void {
    const savedLocale = localStorage.getItem(this.LOCALE_STORAGE_KEY);
    if (savedLocale && this.availableLocales.some(l => l.code === savedLocale)) {
      this.currentLocale.set(savedLocale);
      this.selectedLocale.set(savedLocale);
    }
  }

  private saveLocaleToStorage(locale: string): void {
    localStorage.setItem(this.LOCALE_STORAGE_KEY, locale);
  }

  onLanguageChoiceChange(newLocale: any): void {
    if (newLocale && newLocale !== this.currentLocale()) {
      this.currentLocale.set(newLocale);
      this.selectedLocale.set(newLocale);
      this.saveLocaleToStorage(newLocale);
      this.loadStats();
      this.listManager.reload();
    }
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
        render: (row: BillingPlanListItem) => row.product_type?.name || '-'
      },
      {
        key: 'price_monthly',
        label: this.translate.instant('plans-list.columns.price_monthly'),
        sortable: true,
        type: 'text',
        render: (row: BillingPlanListItem) => {
          const symbol = row.currency?.symbol || '$';
          return `${symbol}${row.price_monthly}`;
        }
      },
      {
        key: 'price_yearly',
        label: this.translate.instant('plans-list.columns.price_yearly'),
        sortable: true,
        type: 'text',
        render: (row: BillingPlanListItem) => {
          const symbol = row.currency?.symbol || '$';
          return `${symbol}${row.price_yearly}`;
        }
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
      baseActions.push(
        {
          label: this.translate.instant('common.edit'),
          icon: 'edit',
          class: 'btn-outline-primary',
          handler: (row: BillingPlanListItem) => this.editPlan(row)
        },

        {
          label: this.translate.instant('plans-list.actions.create_translation'),
          icon: 'translate',
          class: 'btn-outline-info',
          handler: (plan) => this.createTranslation(plan),
          condition: (plan) => {
            const existingLocales = [
              plan.locale,
              ...(plan.localizations?.map(l => l.locale) || [])
            ];
            return existingLocales.length < this.availableLocales.length;
          }
        }

      );

      baseActions.push({
        label: this.translate.instant('plans-list.actions.view_translations'),
        icon: 'language',
        class: 'btn-outline-info',
        handler: (row: BillingPlanListItem) => this.viewTranslations(row),
        condition: (row: BillingPlanListItem) =>
          !!row.localizations && row.localizations.length > 0
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

    this.emptyTitle.set(this.translate.instant('plans-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('plans-list.empty.message'));
  }



  private buildFilters(search: string, filterValues: FilterValue): BillingPlanFilters {
    const filters: BillingPlanFilters = {
      locale: this.currentLocale()
    };

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

  private loadStats(): void {
    this.loadingStats.set(true);
    this.billingService.getBillingPlanStats(this.currentLocale())
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

  createPlan(): void {
    if (!this.canCreate()) return;
    this.planOffcanvasService.openCreate(this.currentLocale() as 'fr' | 'en');
  }

  editPlan(plan: BillingPlanListItem): void {
    if (!this.canUpdate()) return;

    this.billingService.getBillingPlan(plan.documentId, this.currentLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.planOffcanvasService.openEdit(response.data);
        },
        error: (err) => {
          console.error('Error loading plan:', err);
          this.toastService.showError(
            this.translate.instant('plans-list.error.loading')
          );
        }
      });
  }

  createTranslation(plan: BillingPlanListItem): void {
    const existingLocales = [
      plan.locale,
      ...(plan.localizations?.map(l => l.locale) || [])
    ];

    const availableLocales = this.availableLocales
      .filter(loc => !existingLocales.includes(loc.code))
      .map(loc => ({
        code: loc.code,
        label: loc.label,
        flag: loc.flag
      }));

    if (availableLocales.length === 0) {
      this.toastService.showWarning(
        this.translate.instant('plans-list.messages.all_translations_exist')
      );
      return;
    }

    if (availableLocales.length === 1) {
      this.openCreateTranslationOffcanvas(plan.documentId, availableLocales[0].code);
      return;
    }

    this.localeSelectorService.open(availableLocales, (selectedLocale) => {
      this.openCreateTranslationOffcanvas(plan.documentId, selectedLocale);
    });
  }

  private openCreateTranslationOffcanvas(sourceDocumentId: string, targetLocale: string): void {
    this.planOffcanvasService.openCreate(targetLocale as 'fr' | 'en', sourceDocumentId);
  }


  viewTranslations(plan: BillingPlanListItem): void {
    const allTranslations: TranslationOption[] = [];

    // Ajouter la traduction courante
    const currentLocaleConfig = this.availableLocales.find(l => l.code === plan.locale);
    allTranslations.push({
      locale: plan.locale,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || plan.locale.toUpperCase(),
      documentId: plan.documentId
    });

    // Ajouter les localizations
    if (plan.localizations && plan.localizations.length > 0) {
      plan.localizations.forEach(loc => {
        const localeConfig = this.availableLocales.find(l => l.code === loc.locale);
        allTranslations.push({
          locale: loc.locale,
          flag: localeConfig?.flag || '',
          label: localeConfig?.label || loc.locale.toUpperCase(),
          documentId: loc.documentId
        });
      });
    }

    if (allTranslations.length === 0) {
      this.toastService.showWarning(
        this.translate.instant('plans-list.translations_modal.no_translations')
      );
      return;
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.router.navigate(['/admin/system/billing/plans', translation.documentId]);
    });
  }

  deletePlan(plan: BillingPlanListItem): void {
    this.confirmDialog.confirmDelete(plan.plan_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteBillingPlan(plan.documentId, plan.locale)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('plans-list.toast.delete_success', { name: plan.plan_name })
              );
              this.listManager.reload();
            },
            error: (err) => {
              console.error('Error deleting plan:', err);
              this.toastService.showError(
                this.translate.instant('plans-list.toast.delete_error')
              );
            }
          });
      }
    });
  }
}
