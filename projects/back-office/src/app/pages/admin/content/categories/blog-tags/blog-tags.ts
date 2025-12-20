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
import { BlogTag, BlogTagFilters } from '../../../../../core/models/content/blog-tag.model';
import {BlogTagOffcanvasService} from '../../../../../core/services/admin/blog-tag-offcanvas.service';
import {BlogTagOffcanvas} from '../../../../../core/components/admin/blog-tag-offcanvas/blog-tag-offcanvas';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';
import {TranslationsModal} from '../../../../../core/components/admin/translations-modal/translations-modal';
import {BlogCategory} from '../../../../../core/models/content/blog-category.model';

@Component({
  selector: 'app-blog-tags',
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
    BlogTagOffcanvas,
    TranslationsModal,
  ],
  templateUrl: './blog-tags.html',
  styleUrl: './blog-tags.css',
  providers: [ListStateManager],
})
export class BlogTags implements OnInit, OnDestroy {
  private contentService = inject(AdminContentService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  protected translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<BlogTag, BlogTagFilters>);
  private offcanvasService = inject(BlogTagOffcanvasService);
  private translationsModalService = inject(TranslationsModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'blog-tags';
  private isInitialized = false;

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-blog-tags-locale';
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

  canFindTags = computed(() =>
    this.permissionsService.hasPermission('blog-tag', 'blog-tag', 'find')
  );

  canCreateTag = computed(() =>
    this.permissionsService.hasPermission('blog-tag', 'blog-tag', 'create')
  );

  canUpdateTag = computed(() =>
    this.permissionsService.hasPermission('blog-tag', 'blog-tag', 'update')
  );

  canDeleteTag = computed(() =>
    this.permissionsService.hasPermission('blog-tag', 'blog-tag', 'delete')
  );

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<BlogTag>[]>([]);
  actions = signal<ListAction<BlogTag>[]>([]);

  loadingStats = signal(false);

  kpiCards = computed<KpiData[]>(() => {
    const items = this.listManager.items();
    this.languageChange();

    return [
      {
        label: this.translate.instant('blog-tags.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-tags.kpi.total'),
        value: items.length,
        icon: 'sell',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10',
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
      : { field: 'name', direction: 'asc' as const };

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
        this.loadTags(page, pageSize, filters, sortField, sortDirection),
      this.canFindTags
    );
  }

  private initializeConfig(): void {
    this.filters.set([]);

    this.sortOptions.set([
      { value: 'name', label: this.translate.instant('blog-tags.sort.name') },
      { value: 'createdAt', label: this.translate.instant('blog-tags.sort.createdAt') },
    ]);

    this.columns.set([
      {
        key: 'name',
        label: this.translate.instant('blog-tags.columns.name'),
        sortable: true,
        type: 'custom-badge',
        render: (tag: BlogTag) => tag.name,
        cellClass: 'text-primary bg-primary-subtle',
      },
      {
        key: 'slug',
        label: this.translate.instant('blog-tags.columns.slug'),
        sortable: false,
        type: 'text',
      },
      {
        key: 'articles',
        label: this.translate.instant('blog-tags.columns.articles'),
        sortable: false,
        type: 'text',
        render: (tag: BlogTag) => tag.articles?.length?.toString() || '0',
      },
      {
        key: 'createdAt',
        label: this.translate.instant('blog-tags.columns.createdAt'),
        sortable: true,
        type: 'date',
        colspan: 2,
      },
    ]);

    this.actions.set([
      {
        label: this.translate.instant('blog-tags.actions.view_translations'),
        icon: 'translate',
        class: 'btn-outline-info',
        handler: (tag) => this.viewTranslations(tag),
        condition: (tag) => (tag.localizations?.length || 0) > 0,
      },
      {
        label: this.translate.instant('blog-tags.actions.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (tag) => this.editTag(tag),
        condition: () => this.canUpdateTag(),
      },
      {
        label: this.translate.instant('blog-tags.actions.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (tag) => this.deleteTag(tag),
        condition: () => this.canDeleteTag(),
      },
    ]);

    this.emptyTitle.set(this.translate.instant('blog-tags.empty.title'));
    this.emptyMessage.set(this.translate.instant('blog-tags.empty.message'));
  }


  viewTranslations(tag: BlogTag): void {
    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === tag.locale);
    allTranslations.push({
      locale: tag.locale || 'fr',
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || tag.locale?.toUpperCase() || 'FR',
      documentId: tag.documentId
    });

    if (tag.localizations && tag.localizations.length > 0) {
      tag.localizations.forEach((loc: BlogTag) => {
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
        this.translate.instant('blog-tags.no_translations')
      );
      return;
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.onTranslationSelected(translation);
    });
  }


  private onTranslationSelected(translation: TranslationOption): void {
    this.contentService
      .getBlogTags(1, 100, { locale: translation.locale })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const tag = response.data.find(t => t.documentId === translation.documentId);
          if (tag) {
            this.offcanvasService.open(tag);
          } else {
            this.toastService.showError(
              this.translate.instant('blog-tags.error.not_found')
            );
          }
        },
        error: (err) => {
          console.error('Error loading tag:', err);
          this.toastService.showError(
            this.translate.instant('blog-tags.error.loading')
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
        label: this.translate.instant('breadcrumbs.blog-tags.dashboard'),
        route: '/admin/dashboard',
      },
      {
        label: this.translate.instant('breadcrumbs.blog-tags.content'),
      },
      {
        label: this.translate.instant('breadcrumbs.blog-tags.blog_tags'),
        active: true,
      },
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('blog-tags.page_title')
    );
  }

  onLanguageChoiceChange(locale: string): void {
    this.selectedLocale.set(locale);
  }

  private buildFilters(
    search: string | undefined,
    filters: FilterValue
  ): BlogTagFilters {
    const tagFilters: BlogTagFilters = {
      locale: this.currentLocale(),
    };

    if (search) {
      tagFilters.search = search;
    }

    return tagFilters;
  }

  private loadTags(
    page: number,
    pageSize: number,
    filters?: BlogTagFilters,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): void {
    this.contentService
      .getBlogTags(page, pageSize, filters)
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
          console.error('Error loading blog tags:', err);
          this.listManager.setError();
          this.toastService.showError(
            this.translate.instant('blog-tags.error.loading')
          );
        },
      });
  }

  onActionClick(event: { action: ListAction<BlogTag>; row: BlogTag }): void {
    event.action.handler(event.row);
  }

  createTag(): void {
    this.offcanvasService.open();
  }

  editTag(tag: BlogTag): void {
    this.offcanvasService.open(tag);
  }

  deleteTag(tag: BlogTag): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('blog-tags.delete.title'),
        message: this.translate.instant('blog-tags.delete.message', {
          name: tag.name,
        }),
        confirmText: this.translate.instant('blog-tags.delete.confirm'),
        cancelText: this.translate.instant('blog-tags.delete.cancel'),
        confirmClass: 'btn-danger',
        icon: 'delete',
        iconClass: 'text-danger',
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.contentService
            .deleteBlogTag(tag.documentId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.showSuccess(
                  this.translate.instant('blog-tags.delete.success')
                );
                this.listManager.reload();
              },
              error: (err) => {
                console.error('Error deleting blog tag:', err);
                this.toastService.showError(
                  this.translate.instant('blog-tags.delete.error')
                );
              },
            });
        }
      });
  }
}
