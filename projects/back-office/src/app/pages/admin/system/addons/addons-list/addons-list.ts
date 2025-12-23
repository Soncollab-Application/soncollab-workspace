import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  PlanAddonFilters,
  PlanAddonListItem,
  AVAILABLE_LOCALES
} from '../../../../../core/models/admin/billing';
import { TranslationsModal } from '../../../../../core/components/admin/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';

@Component({
  selector: 'app-addons-list',
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
    TranslationsModal
  ],
  templateUrl: './addons-list.html',
  styleUrl: './addons-list.css',
  providers: [ListStateManager]
})
export class AddonsList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<PlanAddonListItem, PlanAddonFilters>);
  private translationsModalService = inject(TranslationsModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'addons-list';

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-billing-addons-locale';
  selectedLocale = signal<string>('fr');

  canFind = computed(() => this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<PlanAddonListItem>[]>([]);
  actions = signal<ListAction<PlanAddonListItem>[]>([]);

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
        label: this.translate.instant('addons-list.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('addons-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'extension',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('addons-list.kpi.active'),
        value: statsData.active || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('addons-list.kpi.visible'),
        value: statsData.visible || 0,
        icon: 'visibility',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      }
    ];
  });

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
        this.loadAddons(page, pageSize, filters, sortField, sortDirection),
      this.canFind
    );
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
      this.listManager.reload();
    }
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'is_active',
        type: 'select',
        label: this.translate.instant('addons-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('addons-list.status.active') },
          { value: 'false', label: this.translate.instant('addons-list.status.inactive') }
        ]
      },
      {
        key: 'visible_to_users',
        type: 'select',
        label: this.translate.instant('addons-list.filters.visibility'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('addons-list.visibility.visible') },
          { value: 'false', label: this.translate.instant('addons-list.visibility.hidden') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('addons-list.sort.newest') },
      { value: 'addon_name:asc', label: this.translate.instant('addons-list.sort.name') },
      { value: 'price_monthly:asc', label: this.translate.instant('addons-list.sort.price_asc') },
      { value: 'price_monthly:desc', label: this.translate.instant('addons-list.sort.price_desc') }
    ]);

    this.columns.set([
      {
        key: 'addon_name',
        label: this.translate.instant('addons-list.columns.name'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'price_monthly',
        label: this.translate.instant('addons-list.columns.price_monthly'),
        sortable: true,
        type: 'text',
        render: (row: PlanAddonListItem) => `$${row.price_monthly}`
      },
      {
        key: 'price_yearly',
        label: this.translate.instant('addons-list.columns.price_yearly'),
        sortable: true,
        type: 'text',
        render: (row: PlanAddonListItem) => `$${row.price_yearly}`
      },
      {
        key: 'is_active',
        label: this.translate.instant('addons-list.columns.status'),
        type: 'custom-badge',
        render: (row: PlanAddonListItem) =>
          row.is_active
            ? this.translate.instant('addons-list.status.active')
            : this.translate.instant('addons-list.status.inactive'),
        cellClass: (row: PlanAddonListItem) =>
          row.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
      },
      {
        key: 'visible_to_users',
        label: this.translate.instant('addons-list.columns.visibility'),
        type: 'custom-badge',
        render: (row: PlanAddonListItem) =>
          row.visible_to_users
            ? this.translate.instant('addons-list.visibility.visible')
            : this.translate.instant('addons-list.visibility.hidden'),
        cellClass: (row: PlanAddonListItem) =>
          row.visible_to_users ? 'bg-info-subtle text-info' : 'bg-secondary-subtle text-secondary',
        colspan: 2
      }
    ]);

    const baseActions: ListAction<PlanAddonListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: PlanAddonListItem) => this.viewAddon(row)
      }
    ];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('common.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (row: PlanAddonListItem) => this.editAddon(row)
      });

      baseActions.push({
        label: this.translate.instant('addons-list.actions.view_translations'),
        icon: 'language',
        class: 'btn-outline-info',
        handler: (row: PlanAddonListItem) => this.viewTranslations(row),
        condition: (row: PlanAddonListItem) =>
          !!row.localizations && row.localizations.length > 0
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: PlanAddonListItem) => this.deleteAddon(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('addons-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('addons-list.empty.message'));
  }

  private buildFilters(search: string, filterValues: FilterValue): PlanAddonFilters {
    const filters: PlanAddonFilters = {
      locale: this.currentLocale()
    };

    if (search) {
      filters.search = search;
    }

    if (filterValues['is_active']) {
      filters.is_active = filterValues['is_active'] === 'true';
    }

    if (filterValues['visible_to_users']) {
      filters.visible_to_users = filterValues['visible_to_users'] === 'true';
    }

    return filters;
  }

  private loadAddons(
    page: number,
    pageSize: number,
    filters: PlanAddonFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getPlanAddons(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading addons:', err);
          this.listManager.setError();
        }
      });
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
        label: this.translate.instant('breadcrumbs.addons-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.addons-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.addons-list.addons'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('header.pages.admin.system.addons')
    );
  }

  onActionClick(event: { action: ListAction<PlanAddonListItem>; row: PlanAddonListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(addon: PlanAddonListItem): void {
    this.viewAddon(addon);
  }

  viewAddon(addon: PlanAddonListItem): void {
    this.router.navigate(['/admin/system/billing/addons', addon.documentId]);
  }

  editAddon(addon: PlanAddonListItem): void {
    console.log('Edit addon:', addon);
  }

  viewTranslations(addon: PlanAddonListItem): void {
    const allTranslations: TranslationOption[] = [
      {
        locale: addon.locale,
        flag: this.availableLocales.find(l => l.code === addon.locale)?.flag || '',
        label: this.availableLocales.find(l => l.code === addon.locale)?.label || addon.locale.toUpperCase(),
        documentId: addon.documentId
      }
    ];

    if (addon.localizations && addon.localizations.length > 0) {
      addon.localizations.forEach(loc => {
        const localeConfig = this.availableLocales.find(l => l.code === loc.locale);
        allTranslations.push({
          locale: loc.locale,
          flag: localeConfig?.flag || '',
          label: localeConfig?.label || loc.locale.toUpperCase(),
          documentId: loc.documentId
        });
      });
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.router.navigate(['/admin/system/billing/addons', translation.documentId]);
    });
  }

  deleteAddon(addon: PlanAddonListItem): void {
    if (!this.canDelete()) return;

    this.confirmDialog.confirmDelete(addon.addon_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePlanAddon(addon.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('addons-list.toast.delete_success', { name: addon.addon_name })
              );
              this.listManager.reload();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('addons-list.toast.delete_error', { name: addon.addon_name })
              );
            }
          });
      }
    });
  }
}
