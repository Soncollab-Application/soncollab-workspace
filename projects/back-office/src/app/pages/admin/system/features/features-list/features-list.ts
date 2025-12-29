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
  FeatureFlagFilters,
  FeatureFlagListItem,
  FeatureFlagStatus,
  AVAILABLE_LOCALES
} from '../../../../../core/models/admin/billing';
import { FeatureFlagOffcanvas } from '../../../../../core/components/admin/offcanvas/feature-flag-offcanvas/feature-flag-offcanvas';
import { FeatureFlagOffcanvasService } from '../../../../../core/services/admin/offcanvas/feature-flag-offcanvas.service';
import { TranslationsModal } from '../../../../../core/components/admin/modals/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/modals/translations-modal.service';
import { LocaleSelectorModalService } from '../../../../../core/services/admin/modals/locale-selector-modal.service';
import { LocaleSelectorModal } from '../../../../../core/components/admin/modals/locale-selector-modal/locale-selector-modal';

@Component({
  selector: 'app-features-list',
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
    FeatureFlagOffcanvas,
    TranslationsModal,
    LocaleSelectorModal
  ],
  templateUrl: './features-list.html',
  styleUrl: './features-list.css',
  providers: [ListStateManager]
})
export class FeaturesList implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<FeatureFlagListItem, FeatureFlagFilters>);
  private featureFlagOffcanvasService = inject(FeatureFlagOffcanvasService);
  private translationsModalService = inject(TranslationsModalService);
  private localeSelectorService = inject(LocaleSelectorModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'features-list';

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-billing-features-locale';
  selectedLocale = signal<string>('fr');

  canFind = computed(() => this.permissionsService.hasPermission('feature-flag', 'feature-flag', 'find'));
  canCreate = computed(() => this.permissionsService.hasPermission('feature-flag', 'feature-flag', 'create'));
  canUpdate = computed(() => this.permissionsService.hasPermission('feature-flag', 'feature-flag', 'update'));
  canDelete = computed(() => this.permissionsService.hasPermission('feature-flag', 'feature-flag', 'delete'));

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<FeatureFlagListItem>[]>([]);
  actions = signal<ListAction<FeatureFlagListItem>[]>([]);

  stats = signal<any>(null);
  loadingStats = signal(false);

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

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('features-list.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('features-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'flag',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('features-list.kpi.stable'),
        value: statsData.stable || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('features-list.kpi.beta'),
        value: statsData.beta || 0,
        icon: 'science',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      }
    ];
  });

  constructor() {
    let wasOpen = false;

    effect(() => {
      const isOpen = this.featureFlagOffcanvasService.isOpen();

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
        this.loadFeatures(page, pageSize, filters, sortField, sortDirection),
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

  private onLanguageChange(): void {
    this.initializeConfig();
    this.updatePageTitle();
    this.setBreadcrumbs();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.features-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.features-list.system')
      },
      {
        label: this.translate.instant('breadcrumbs.features-list.features'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('features-list.page_title')
    );
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.billingService.getFeatureFlagStats(this.currentLocale())
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
        key: 'feature_flag_status',
        type: 'select',
        label: this.translate.instant('features-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: this.getStatusOptions()
      },
      {
        key: 'is_enabled_by_default',
        type: 'select',
        label: this.translate.instant('features-list.filters.enabled_by_default'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('common.yes') },
          { value: 'false', label: this.translate.instant('common.no') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('features-list.sort.newest') },
      { value: 'name:asc', label: this.translate.instant('features-list.sort.name') }
    ]);

    this.columns.set([
      {
        key: 'name',
        label: this.translate.instant('features-list.columns.name'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'description',
        label: this.translate.instant('features-list.columns.description'),
        sortable: false,
        type: 'text',
        render: (feature) => feature.description || '-'
      },
      {
        key: 'feature_flag_status',
        label: this.translate.instant('features-list.columns.status'),
        sortable: true,
        type: 'custom-badge',
        render: (feature) => this.translate.instant(`features-list.status.${feature.feature_flag_status}`),
        cellClass: (feature) => this.getStatusBadgeClass(feature.feature_flag_status)
      },
      {
        key: 'is_enabled_by_default',
        label: this.translate.instant('features-list.columns.enabled_by_default'),
        sortable: false,
        type: 'custom-badge',
        render: (feature) =>
          feature.is_enabled_by_default
            ? this.translate.instant('common.yes')
            : this.translate.instant('common.no'),
        cellClass: (feature) =>
          feature.is_enabled_by_default
            ? 'bg-success-subtle text-success'
            : 'bg-secondary-subtle text-secondary'
      },
      {
        key: 'createdAt',
        label: this.translate.instant('features-list.columns.createdAt'),
        sortable: true,
        type: 'date',
        colspan: 2
      }
    ]);

    const baseActions: ListAction<FeatureFlagListItem>[] = [];

    if (this.canUpdate()) {
      baseActions.push({
        label: this.translate.instant('common.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (row: FeatureFlagListItem) => this.editFeature(row)
      });
    }

    baseActions.push({
      label: this.translate.instant('features-list.actions.create_translation'),
      icon: 'translate',
      class: 'btn-outline-info',
      handler: (feature) => this.createTranslation(feature),
      condition: (feature) => {
        const existingLocales = [
          feature.locale,
          ...(feature.localizations?.map(l => l.locale) || [])
        ];
        return existingLocales.length < this.availableLocales.length;
      }
    });

    baseActions.push({
      label: this.translate.instant('features-list.actions.view_translations'),
      icon: 'language',
      class: 'btn-outline-secondary',
      handler: (feature) => this.viewTranslations(feature),
      condition: (feature) => !!(feature.localizations && feature.localizations.length > 0)
    });

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: FeatureFlagListItem) => this.deleteFeature(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('features-list.empty.title'));
    this.emptyMessage.set(this.translate.instant('features-list.empty.message'));
  }

  private getStatusOptions(): { value: FeatureFlagStatus; label: string }[] {
    const statuses: FeatureFlagStatus[] = ['stable', 'beta', 'deprecated'];
    return statuses.map(status => ({
      value: status,
      label: this.translate.instant(`features-list.status.${status}`)
    }));
  }

  private getStatusBadgeClass(status: FeatureFlagStatus): string {
    const classes: Record<FeatureFlagStatus, string> = {
      stable: 'text-success bg-success-subtle',
      beta: 'text-warning bg-warning-subtle',
      deprecated: 'text-danger bg-danger-subtle'
    };
    return classes[status] || 'text-secondary bg-secondary-subtle';
  }

  private buildFilters(search: string, filterValues: FilterValue): FeatureFlagFilters {
    const filters: FeatureFlagFilters = {
      locale: this.currentLocale()
    };

    if (search) {
      filters.search = search;
    }

    if (filterValues['feature_flag_status']) {
      filters.feature_flag_status = filterValues['feature_flag_status'] as FeatureFlagStatus;
    }

    if (filterValues['is_enabled_by_default']) {
      filters.is_enabled_by_default = filterValues['is_enabled_by_default'] === 'true';
    }

    return filters;
  }

  private loadFeatures(
    page: number,
    pageSize: number,
    filters: FeatureFlagFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.billingService.getFeatureFlags(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading features:', err);
          this.listManager.setError();
        }
      });
  }

  createFeature(): void {
    if (!this.canCreate()) return;
    this.featureFlagOffcanvasService.openCreate(this.currentLocale() as 'fr' | 'en');
  }

  editFeature(feature: FeatureFlagListItem): void {
    if (!this.canUpdate()) return;

    this.billingService.getFeatureFlag(feature.documentId, this.currentLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.featureFlagOffcanvasService.openEdit(response.data);
        },
        error: (err) => {
          console.error('Error loading feature:', err);
          this.toastService.showError(
            this.translate.instant('features-list.error.loading')
          );
        }
      });
  }

  createTranslation(feature: FeatureFlagListItem): void {
    const existingLocales = [
      feature.locale,
      ...(feature.localizations?.map(l => l.locale) || [])
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
        this.translate.instant('features-list.messages.all_translations_exist')
      );
      return;
    }

    if (availableLocales.length === 1) {
      this.openCreateTranslationOffcanvas(feature.documentId, availableLocales[0].code);
      return;
    }

    this.localeSelectorService.open(availableLocales, (selectedLocale) => {
      this.openCreateTranslationOffcanvas(feature.documentId, selectedLocale);
    });
  }

  private openCreateTranslationOffcanvas(sourceDocumentId: string, targetLocale: string): void {
    this.featureFlagOffcanvasService.openCreate(targetLocale as 'fr' | 'en', sourceDocumentId);
  }

  viewTranslations(feature: FeatureFlagListItem): void {
    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === feature.locale);
    allTranslations.push({
      locale: feature.locale,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || feature.locale.toUpperCase(),
      documentId: feature.documentId
    });

    if (feature.localizations && feature.localizations.length > 0) {
      feature.localizations.forEach(loc => {
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
      this.router.navigate(['/admin/system/billing/features', translation.documentId]);
    });
  }

  deleteFeature(feature: FeatureFlagListItem): void {
    this.confirmDialog.confirmDelete(feature.name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteFeatureFlag(feature.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('features-list.toast.delete_success', { name: feature.name })
              );
              this.loadStats();
              this.listManager.reload();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('features-list.toast.delete_error', { name: feature.name })
              );
            }
          });
      }
    });
  }

  onRowClick(feature: FeatureFlagListItem): void {
    this.router.navigate(['/admin/system/billing/features', feature.documentId]);
  }

  onActionClick(event: { action: ListAction<FeatureFlagListItem>; row: FeatureFlagListItem }): void {
    event.action.handler(event.row);
  }
}
