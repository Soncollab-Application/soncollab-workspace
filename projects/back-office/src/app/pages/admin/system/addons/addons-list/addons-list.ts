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
  PlanAddonFilters,
  PlanAddonListItem,
  AVAILABLE_LOCALES
} from '../../../../../core/models/admin/billing';
import { TranslationsModal } from '../../../../../core/components/admin/modals/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/modals/translations-modal.service';
import {AddonOffcanvasService} from '../../../../../core/services/admin/offcanvas/addon-offcanvas.service';
import {LocaleSelectorModalService} from '../../../../../core/services/admin/modals/locale-selector-modal.service';
import {AddonOffcanvas} from '../../../../../core/components/admin/offcanvas/addon-offcanvas/addon-offcanvas';
import {LocaleSelectorModal} from '../../../../../core/components/admin/modals/locale-selector-modal/locale-selector-modal';

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
    TranslationsModal,
    AddonOffcanvas,
    LocaleSelectorModal
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
  private addonOffcanvasService = inject(AddonOffcanvasService);
  private localeSelectorService = inject(LocaleSelectorModalService);

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

  hasLocalizations = computed(() => {
    return this.availableLocales.length > 1;
  });

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

  constructor() {
    let wasOpen = false;

    effect(() => {
      const isOpen = this.addonOffcanvasService.isOpen();

      if (wasOpen && !isOpen) {
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

  private getAddonCurrencySymbol(addon: PlanAddonListItem): string {
    return addon.currency?.symbol || '€';
  }

  private formatPrice(amount: number, addon: PlanAddonListItem): string {
    const symbol = this.getAddonCurrencySymbol(addon);
    const position = addon.currency?.symbol_position || 'right';

    if (position === 'left') {
      return `${symbol}${amount}`;
    } else {
      return `${amount} ${symbol}`;
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
        render: (row: PlanAddonListItem) => this.formatPrice(row.price_monthly, row)
      },
      {
        key: 'price_yearly',
        label: this.translate.instant('addons-list.columns.price_yearly'),
        sortable: true,
        type: 'text',
        render: (row: PlanAddonListItem) => this.formatPrice(row.price_yearly, row)
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

    const baseActions: ListAction<PlanAddonListItem>[] = [];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('common.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (row: PlanAddonListItem) => this.editAddon(row)
      });
    }

    if (this.hasLocalizations()) {
      baseActions.push({
        label: this.translate.instant('common.view_translations'),
        icon: 'translate',
        class: 'btn-outline-info',
        handler: (row: PlanAddonListItem) => this.viewTranslations(row),
        condition: (row: PlanAddonListItem) => !!(row.localizations && row.localizations.length > 0)
      });

      baseActions.push({
        label: this.translate.instant('common.add_translation'),
        icon: 'add',
        class: 'btn-outline-secondary',
        handler: (row: PlanAddonListItem) => this.createTranslation(row),
        condition: (row: PlanAddonListItem) => (!row.localizations || row.localizations.length < this.availableLocales.length - 1)
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

  createAddon(): void {
    if (!this.canCreate()) return;
    this.addonOffcanvasService.openCreate(this.currentLocale() as 'fr' | 'en');
  }

  editAddon(addon: PlanAddonListItem): void {
    if (!this.canUpdate()) return;

    this.billingService.getPlanAddon(addon.documentId, addon.locale)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.addonOffcanvasService.openEdit(response.data);
        },
        error: (err) => {
          console.error('Error loading addon:', err);
          this.toastService.showError(
            this.translate.instant('addons-list.error.loading')
          );
        }
      });
  }

  createTranslation(addon: PlanAddonListItem): void {
    const existingLocales = [
      addon.locale,
      ...(addon.localizations?.map(l => l.locale) || [])
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
        this.translate.instant('addons-list.messages.all_translations_exist')
      );
      return;
    }

    if (availableLocales.length === 1) {
      this.openCreateTranslationOffcanvas(addon.documentId, availableLocales[0].code);
      return;
    }

    this.localeSelectorService.open(availableLocales, (selectedLocale) => {
      this.openCreateTranslationOffcanvas(addon.documentId, selectedLocale);
    });
  }

  private openCreateTranslationOffcanvas(sourceDocumentId: string, targetLocale: string): void {
    this.addonOffcanvasService.openCreate(targetLocale as 'fr' | 'en', sourceDocumentId);
  }

  viewTranslations(addon: PlanAddonListItem): void {
    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === addon.locale);
    if (currentLocaleConfig) {
      allTranslations.push({
        locale: addon.locale,
        flag: currentLocaleConfig.flag,
        label: currentLocaleConfig.label,
        documentId: addon.documentId
      });
    }

    if (addon.localizations && addon.localizations.length > 0) {
      addon.localizations.forEach(loc => {
        const localeConfig = this.availableLocales.find(l => l.code === loc.locale);
        if (localeConfig) {
          allTranslations.push({
            locale: loc.locale,
            flag: localeConfig.flag,
            label: localeConfig.label,
            documentId: loc.documentId
          });
        }
      });
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.router.navigate(['/admin/system/billing/addons', translation.documentId]);
    });
  }

  deleteAddon(addon: PlanAddonListItem): void {
    this.confirmDialog.confirmDelete(addon.addon_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePlanAddon(addon.documentId, addon.locale)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('addons-list.messages.delete_success', { name: addon.addon_name })
              );
              this.listManager.reload();
            },
            error: (err) => {
              console.error('Error deleting addon:', err);
              this.toastService.showError(
                this.translate.instant('addons-list.messages.delete_error')
              );
            }
          });
      }
    });
  }
}
