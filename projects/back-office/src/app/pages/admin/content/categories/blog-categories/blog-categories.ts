import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import {
  DataList,
  ListColumn,
  ListAction,
  LanguageOrchestratorService,
  PermissionService,
  ConfirmDialogService,
  ToastService,
  KpiCardComponent,
  KpiData,
  Choice,
  ChoiceConfig,
  ChoiceOption,
  FilterBarComponent,
  FilterConfig,
  SortOption,
  ListStateManager,
  ListStateConfig,
  FilterValue,
} from 'shared-lib';
import { AdminContentService } from '../../../../../core/services/admin/admin-content.service';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { AVAILABLE_LOCALES } from '../../../../../core/models/content/blog-article.model';
import { BlogCategory, BlogCategoryFilters } from '../../../../../core/models/content/blog-category.model';
import {BlogCategoryOffcanvasService} from '../../../../../core/services/admin/blog-category-offcanvas.service';
import {
  BlogCategoryOffcanvas
} from '../../../../../core/components/admin/blog-category-offcanvas/blog-category-offcanvas';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';
import {TranslationsModal} from '../../../../../core/components/admin/translations-modal/translations-modal';

@Component({
  selector: 'app-blog-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    FilterBarComponent,
    Breadcrumb,
    KpiCardComponent,
    DataList,
    Choice,
    BlogCategoryOffcanvas,
    TranslationsModal,
  ],
  templateUrl: './blog-categories.html',
  styleUrl: './blog-categories.css',
  providers: [ListStateManager],
})
export class BlogCategories implements OnInit, OnDestroy {
  private contentService = inject(AdminContentService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  protected translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<BlogCategory, BlogCategoryFilters>);
  private offcanvasService = inject(BlogCategoryOffcanvasService);
  private translationsModalService = inject(TranslationsModalService);



  private destroy$ = new Subject<void>();
  private componentId = 'blog-categories';
  private isInitialized = false;

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-blog-categories-locale';
  selectedLocale = signal<string>('fr');

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

  canFindCategories = computed(() =>
    this.permissionsService.hasPermission('blog-category', 'blog-category', 'find')
  );

  canCreateCategory = computed(() =>
    this.permissionsService.hasPermission('blog-category', 'blog-category', 'create')
  );

  canUpdateCategory = computed(() =>
    this.permissionsService.hasPermission('blog-category', 'blog-category', 'update')
  );

  canDeleteCategory = computed(() =>
    this.permissionsService.hasPermission('blog-category', 'blog-category', 'delete')
  );

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<BlogCategory>[]>([]);
  actions = signal<ListAction<BlogCategory>[]>([]);

  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const items = this.listManager.items();
    this.languageChange();

    return [
      {
        label: this.translate.instant('blog-categories.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-categories.kpi.total'),
        value: items.length,
        icon: 'label',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-categories.kpi.featured'),
        value: items.filter(c => c.is_featured).length,
        icon: 'star',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10',
      },
    ];
  });

  constructor() {
    effect(() => {
      const locale = this.selectedLocale();
      if (this.isInitialized && locale !== this.currentLocale()) {
        this.currentLocale.set(locale);
        localStorage.setItem(this.LOCALE_STORAGE_KEY, locale);
        this.listManager.reload();
      }
    });
  }

  ngOnInit(): void {
    this.initializeLocale();
    this.selectedLocale.set(this.currentLocale());
    this.initializeConfig();
    this.initializeListManager();
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    this.listManager.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeLocale(): void {
    const savedLocale = localStorage.getItem(this.LOCALE_STORAGE_KEY);
    if (savedLocale && this.availableLocales.some(l => l.code === savedLocale)) {
      this.currentLocale.set(savedLocale);
      this.selectedLocale.set(savedLocale);
    } else {
      this.currentLocale.set('fr');
      this.selectedLocale.set('fr');
    }
  }

  private initializeListManager(): void {
    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' as const }
      : { field: 'order', direction: 'asc' as const };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 25,
      onLanguageChange: () => this.onLanguageChange(),
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) =>
        this.loadCategories(page, pageSize, filters, sortField, sortDirection),
      this.canFindCategories
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'is_featured',
        type: 'select',
        label: this.translate.instant('blog-categories.filters.featured'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('blog-categories.filters.featured_yes') },
          { value: 'false', label: this.translate.instant('blog-categories.filters.featured_no') },
        ],
      },
    ]);

    this.sortOptions.set([
      { value: 'order', label: this.translate.instant('blog-categories.sort.order') },
      { value: 'name', label: this.translate.instant('blog-categories.sort.name') },
      { value: 'createdAt', label: this.translate.instant('blog-categories.sort.createdAt') },
    ]);

    this.columns.set([
      {
        key: 'name',
        label: this.translate.instant('blog-categories.columns.name'),
        sortable: true,
        type: 'text',
      },
      {
        key: 'slug',
        label: this.translate.instant('blog-categories.columns.slug'),
        sortable: false,
        type: 'text',
      },
      {
        key: 'order',
        label: this.translate.instant('blog-categories.columns.order'),
        sortable: true,
        type: 'text',
      },
      {
        key: 'is_featured',
        label: this.translate.instant('blog-categories.columns.featured'),
        sortable: false, // ← is_featured n'est pas dans sortOptions
        type: 'custom-badge',
        render: (category: BlogCategory) =>
          category.is_featured
            ? this.translate.instant('blog-categories.badges.featured')
            : this.translate.instant('blog-categories.badges.not_featured'),
        cellClass: (category: BlogCategory) =>
          category.is_featured
            ? 'text-warning bg-warning-subtle'
            : 'text-secondary bg-secondary-subtle',
      },
      {
        key: 'articles',
        label: this.translate.instant('blog-categories.columns.articles'),
        sortable: false,
        type: 'text',
        render: (category: BlogCategory) => category.articles?.length?.toString() || '0',
      },
      {
        key: 'createdAt',
        label: this.translate.instant('blog-categories.columns.createdAt'),
        sortable: true,
        type: 'date',
        colspan: 2,
      },
    ]);

    this.actions.set([
      {
        label: this.translate.instant('blog-categories.actions.view_translations'),
        icon: 'translate',
        class: 'btn-outline-info',
        handler: (category) => this.viewTranslations(category),
        condition: (category) => (category.localizations?.length || 0) > 0,
      },
      {
        label: this.translate.instant('blog-categories.actions.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (category) => this.editCategory(category),
        condition: () => this.canUpdateCategory(),
      },
      {
        label: this.translate.instant('blog-categories.actions.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (category) => this.deleteCategory(category),
        condition: () => this.canDeleteCategory(),
      },
    ]);

    this.emptyTitle.set(this.translate.instant('blog-categories.empty.title'));
    this.emptyMessage.set(this.translate.instant('blog-categories.empty.message'));
  }

  viewTranslations(category: BlogCategory): void {
    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === category.locale);
    allTranslations.push({
      locale: category.locale || 'fr',
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || category.locale?.toUpperCase() || 'FR',
      documentId: category.documentId
    });

    if (category.localizations && category.localizations.length > 0) {
      category.localizations.forEach((loc: BlogCategory) => {
        const localeConfig = this.availableLocales.find(l => l.code === loc.locale);
        allTranslations.push({
          locale: loc.locale || 'fr',
          flag: localeConfig?.flag || '',
          label: localeConfig?.label || loc.locale?.toUpperCase() || 'FR',
          documentId: loc.documentId
        });
      });
    }

    if (allTranslations.length === 0) {
      this.toastService.showWarning(
        this.translate.instant('blog-categories.no_translations')
      );
      return;
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.onTranslationSelected(translation);
    });
  }

  private onTranslationSelected(translation: TranslationOption): void {
    // Charger la catégorie dans la bonne locale
    this.contentService
      .getBlogCategories(1, 100, { locale: translation.locale })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const category = response.data.find(c => c.documentId === translation.documentId);
          if (category) {
            // Ouvrir l'offcanvas en mode édition
            this.offcanvasService.open(category);
          } else {
            this.toastService.showError(
              this.translate.instant('blog-categories.error.not_found')
            );
          }
        },
        error: (err) => {
          console.error('Error loading category:', err);
          this.toastService.showError(
            this.translate.instant('blog-categories.error.loading')
          );
        },
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
        label: this.translate.instant('breadcrumbs.blog-categories.dashboard'),
        route: '/admin/dashboard',
      },
      {
        label: this.translate.instant('breadcrumbs.blog-categories.content'),
      },
      {
        label: this.translate.instant('breadcrumbs.blog-categories.blog_categories'),
        active: true,
      },
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('blog-categories.page_title')
    );
  }

  onLanguageChoiceChange(locale: string): void {
    this.selectedLocale.set(locale);
  }

  private buildFilters(
    search: string | undefined,
    filters: FilterValue
  ): BlogCategoryFilters {
    const categoryFilters: BlogCategoryFilters = {
      locale: this.currentLocale(),
    };

    if (search) {
      categoryFilters.search = search;
    }

    if (filters['is_featured']) {
      categoryFilters.is_featured = filters['is_featured'] === 'true';
    }

    return categoryFilters;
  }

  private loadCategories(
    page: number,
    pageSize: number,
    filters?: BlogCategoryFilters,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): void {
    this.contentService
      .getBlogCategories(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading blog categories:', err);
          this.listManager.setError();
          this.toastService.showError(
            this.translate.instant('blog-categories.error.loading')
          );
        },
      });
  }

  onActionClick(event: { action: ListAction<BlogCategory>; row: BlogCategory }): void {
    event.action.handler(event.row);
  }

  createCategory(): void {
    this.offcanvasService.open();
  }

  editCategory(category: BlogCategory): void {
    this.offcanvasService.open(category);
  }


  deleteCategory(category: BlogCategory): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('blog-categories.delete.title'),
        message: this.translate.instant('blog-categories.delete.message', {
          name: category.name,
        }),
        confirmText: this.translate.instant('blog-categories.delete.confirm'),
        cancelText: this.translate.instant('blog-categories.delete.cancel'),
        confirmClass: 'btn-danger',
        icon: 'delete',
        iconClass: 'text-danger',
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.contentService
            .deleteBlogCategory(category.documentId, category.locale)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.showSuccess(
                  this.translate.instant('blog-categories.delete.success')
                );
                this.listManager.reload();
              },
              error: (err) => {
                console.error('Error deleting blog category:', err);
                this.toastService.showError(
                  this.translate.instant('blog-categories.delete.error')
                );
              },
            });
        }
      });
  }

}
