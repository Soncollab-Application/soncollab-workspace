import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  FilterBarComponent,
  FilterConfig,
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
  FilterValue,
  Choice,
  ChoiceOption,
  ChoiceConfig,
} from 'shared-lib';
import { Subject, takeUntil } from 'rxjs';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { AdminContentService } from '../../../../../core/services/admin/admin-content.service';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import {
  BlogArticle,
  BlogArticleFilters,
  AVAILABLE_LOCALES,
} from '../../../../../core/models/content/blog-article.model';
import { ContentStatus } from '../../../../../core/models/content/content-common.model';
import { BlogArticleStats } from '../../../../../core/models/content/content-stats.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogCategoryFilters } from '../../../../../core/models/content/blog-category.model';
import {BlogArticleOffcanvasService} from '../../../../../core/services/admin/offcanvas/blog-article-offcanvas.service';
import {BlogArticleOffcanvas} from '../../../../../core/components/admin/offcanvas/blog-article-offcanvas/blog-article-offcanvas';
import {TranslationsModal} from '../../../../../core/components/admin/modals/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/modals/translations-modal.service';
import {LocaleSelectorModalService} from '../../../../../core/services/admin/modals/locale-selector-modal.service';
import {LocaleSelectorModal} from '../../../../../core/components/admin/modals/locale-selector-modal/locale-selector-modal';

@Component({
  selector: 'app-blog-articles',
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
    BlogArticleOffcanvas,
    TranslationsModal,
    LocaleSelectorModal,
  ],
  templateUrl: './blog-articles.html',
  styleUrl: './blog-articles.css',
  providers: [ListStateManager],
})
export class BlogArticles implements OnInit, OnDestroy {
  private contentService = inject(AdminContentService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  protected translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected offcanvasService = inject(BlogArticleOffcanvasService);
  protected listManager = inject(ListStateManager<BlogArticle, BlogArticleFilters>);
  protected translationsModalService = inject(TranslationsModalService);
  protected localeSelectorService = inject(LocaleSelectorModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'blog-articles';
  private isInitialized = false;
  private isLoadingCategories = false;

  readonly availableLocales = AVAILABLE_LOCALES;
  currentLocale = signal<string>('fr');
  private readonly LOCALE_STORAGE_KEY = 'admin-content-locale';

  // Choice pour langue
  selectedLocale = signal<string>('fr');

  viewsStats = signal<{ [slug: string]: number }>({});

  languageOptions = computed<ChoiceOption[]>(() =>
    this.availableLocales.map(locale => ({
      value: locale.code,
      label: `${locale.flag} ${locale.label}`
    }))
  );

  languageConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false,
  };

  // Permissions
  canFindArticles = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'find')
  );
  canCreateArticle = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'create')
  );
  canUpdateArticle = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'update')
  );
  canDeleteArticle = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'delete')
  );
  canReviewArticle = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'review')
  );

  emptyTitle = signal('');
  emptyMessage = signal('');
  categories = signal<{ value: string; label: string }[]>([]);

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<BlogArticle>[]>([]);
  actions = signal<ListAction<BlogArticle>[]>([]);

  stats = signal<BlogArticleStats | null>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);

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
        label: this.translate.instant('blog-articles.kpi.language'),
        value: this.currentLocaleLabel(),
        icon: 'language',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-articles.kpi.total'),
        value: (statsData.draft || 0) + (statsData.pending_review || 0) + (statsData.approved || 0),
        icon: 'article',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-articles.kpi.published'),
        value: statsData.published || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-articles.kpi.pending'),
        value: statsData.pending_review || 0,
        icon: 'pending',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10',
      },
      {
        label: this.translate.instant('blog-articles.kpi.draft'),
        value: statsData.draft || 0,
        icon: 'draft',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10',
      },
    ];
  });

  ngOnInit(): void {
    this.initializeLocale();
    this.selectedLocale.set(this.currentLocale());
    this.languageOrchestrator.registerComponent(this.componentId, () => this.onLanguageChange());
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.initializeListManager();
    this.loadStats();
    this.loadCategories();

    setTimeout(() => {
      this.isInitialized = true;
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private initializeLocale(): void {
    const savedLocale = localStorage.getItem(this.LOCALE_STORAGE_KEY);
    const interfaceLang = this.translate.currentLang;

    let defaultLocale = 'fr';

    if (savedLocale && this.availableLocales.some(l => l.code === savedLocale)) {
      defaultLocale = savedLocale;
    } else if (this.availableLocales.some(l => l.code === interfaceLang)) {
      defaultLocale = interfaceLang;
    }

    this.currentLocale.set(defaultLocale);
  }

  onLanguageChoiceChange(event: any): void {
    if (!this.isInitialized) return;
    const newLocale = event;
    if (newLocale && newLocale !== this.currentLocale()) {
      this.onLocaleChange(newLocale);
    }
  }

  onLocaleChange(localeCode: string): void {
    if (!this.isInitialized || localeCode === this.currentLocale()) return;
    this.currentLocale.set(localeCode);
    this.selectedLocale.set(localeCode);
    localStorage.setItem(this.LOCALE_STORAGE_KEY, localeCode);
    this.loadCategories();
    this.loadStats();
    this.listManager.reload();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.blog-articles.dashboard'),
        route: '/admin/dashboard',
      },
      {
        label: this.translate.instant('breadcrumbs.blog-articles.content'),
      },
      {
        label: this.translate.instant('breadcrumbs.blog-articles.blog_articles'),
        active: true,
      },
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('blog-articles.page_title'));
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.contentService
      .getContentStats(this.currentLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats.set(response.data.blog);
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats.set(false);
        },
      });
  }

  private loadCategories(): void {
    if (this.isLoadingCategories) return;

    this.isLoadingCategories = true;

    const filters: BlogCategoryFilters = {
      locale: this.currentLocale()
    };

    this.contentService.getBlogCategories(1, 100, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const categoryOptions = response.data.map(cat => ({
            value: cat.documentId,
            label: cat.name
          }));
          this.categories.set(categoryOptions);

          this.filters.update(configs =>
            configs.map(config =>
              config.key === 'category'
                ? { ...config, options: categoryOptions }
                : config
            )
          );

          this.isLoadingCategories = false;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories.set([]);
          this.isLoadingCategories = false;
        }
      });
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('blog-articles.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: this.getStatusOptions(),
      },
      {
        key: 'category',
        type: 'select',
        label: this.translate.instant('blog-articles.filters.category'),
        placeholder: this.translate.instant('common.all'),
        options: this.categories(),
      },
      {
        key: 'is_featured',
        type: 'select',
        label: this.translate.instant('blog-articles.filters.featured'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'true', label: this.translate.instant('blog-articles.filters.featured_yes') },
          { value: 'false', label: this.translate.instant('blog-articles.filters.featured_no') },
        ],
      },
    ]);

    this.sortOptions.set([
      { value: 'createdAt', label: this.translate.instant('blog-articles.sort.createdAt') },
      { value: 'updatedAt', label: this.translate.instant('blog-articles.sort.updatedAt') },
      { value: 'title', label: this.translate.instant('blog-articles.sort.title') },
      { value: 'publishedAt', label: this.translate.instant('blog-articles.sort.publishedAt') },
    ]);

    this.columns.set([
      {
        key: 'title',
        label: this.translate.instant('blog-articles.columns.title'),
        sortable: true,
        type: 'text',
        render: (article) => article.title,
      },
      {
        key: 'locale',
        label: this.translate.instant('blog-articles.columns.locale'),
        sortable: false,
        type: 'custom-badge',
        render: (article) => {
          const localeConfig = this.availableLocales.find(l => l.code === article.locale);
          return localeConfig ? `${localeConfig.flag} ${localeConfig.label}` : article.locale?.toUpperCase() || '-';
        },
        cellClass: 'text-info bg-info-subtle',
      },
      {
        key: 'translations',
        label: this.translate.instant('blog-articles.columns.translations'),
        sortable: false,
        type: 'custom-badge',
        render: (article) => {
          if (!article.localizations || article.localizations.length === 0) {
            return this.translate.instant('blog-articles.badges.no_translations');
          }

          // Afficher les locales disponibles
          const availableLocales = article.localizations
            .map(loc => {
              const config = this.availableLocales.find(l => l.code === loc.locale);
              return config ? config.flag : loc.locale.toUpperCase();
            })
            .join(' ');

          return `${availableLocales} (${article.localizations.length})`;
        },
        cellClass: (article) => {
          const hasTranslations = article.localizations && article.localizations.length > 0;
          return hasTranslations ? 'text-success bg-success-subtle' : 'text-warning bg-warning-subtle';
        },
      },
      {
        key: 'category',
        label: this.translate.instant('blog-articles.columns.category'),
        sortable: false,
        type: 'custom-badge',
        render: (article) => article.category?.name || '-',
        cellClass: 'text-primary bg-primary-subtle',
      },
      {
        key: 'author',
        label: this.translate.instant('blog-articles.columns.author'),
        sortable: false,
        type: 'text',
        render: (article) =>
          article.author
            ? `${article.author.first_name} ${article.author.last_name}`
            : '-',
      },
      {
        key: 'content_status',
        label: this.translate.instant('blog-articles.columns.status'),
        sortable: false,
        type: 'custom-badge',
        render: (article) =>
          this.translate.instant(`blog-articles.statuses.${article.content_status}`),
        cellClass: (article) => this.getStatusBadgeClass(article.content_status),
      },
      {
        key: 'is_featured',
        label: this.translate.instant('blog-articles.columns.featured'),
        sortable: false,
        type: 'custom-badge',
        render: (article) =>
          article.is_featured
            ? this.translate.instant('blog-articles.badges.featured')
            : this.translate.instant('blog-articles.badges.not_featured'),
        cellClass: (article) =>
          article.is_featured
            ? 'text-warning bg-warning-subtle'
            : 'text-secondary bg-secondary-subtle',
      },
      {
        key: 'view_count',
        label: this.translate.instant('blog-articles.columns.views'),
        sortable: false,
        type: 'text',
        render: (article) => {
          const views = this.viewsStats()[article.slug];
          return views !== undefined ? views.toString() : '...';
        },
      },
      {
        key: 'createdAt',
        label: this.translate.instant('blog-articles.columns.createdAt'),
        sortable: true,
        type: 'date',
        colspan: 2,
      },
    ]);

    this.actions.set([
      {
        label: this.translate.instant('blog-articles.actions.edit'),
        icon: 'edit',
        class: 'btn-outline-primary',
        handler: (article) => this.editArticle(article),
        condition: () => this.canUpdateArticle(),
      },
      {
        label: this.translate.instant('blog-articles.actions.create_translation'),
        icon: 'translate',
        class: 'btn-outline-info',
        handler: (article) => this.createTranslation(article),
        condition: (article) => {
          const existingLocales = [
            article.locale,
            ...(article.localizations?.map(l => l.locale) || [])
          ];
          return existingLocales.length < this.availableLocales.length;
        },
      },
      {
        label: this.translate.instant('blog-articles.actions.view_translations'),
        icon: 'language',
        class: 'btn-outline-secondary',
        handler: (article) => this.viewTranslations(article),
        condition: (article) => !!(article.localizations && article.localizations.length > 0),
      },
      {
        label: this.translate.instant('blog-articles.actions.approve'),
        icon: 'check_circle',
        class: 'btn-outline-success',
        handler: (article) => this.approveArticle(article),
        condition: (article) => this.canReviewArticle() && article.content_status === 'pending_review',
      },
      {
        label: this.translate.instant('blog-articles.actions.reject'),
        icon: 'cancel',
        class: 'btn-outline-danger',
        handler: (article) => this.rejectArticle(article),
        condition: (article) => this.canReviewArticle() && article.content_status === 'pending_review',
      },
      {
        label: this.translate.instant('blog-articles.actions.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (article) => this.deleteArticle(article),
        condition: () => this.canDeleteArticle(),
      },
    ]);

    this.emptyTitle.set(this.translate.instant('blog-articles.empty.title'));
    this.emptyMessage.set(this.translate.instant('blog-articles.empty.message'));
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
      this.languageChange.update((v) => v + 1);
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
      onLanguageChange: () => this.onLanguageChange(),
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildArticleFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) =>
        this.loadArticles(page, pageSize, filters, sortField, sortDirection),
      this.canFindArticles
    );
  }

  private getStatusOptions() {
    const statuses: ContentStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];
    return statuses.map((status) => ({
      value: status,
      label: this.translate.instant(`blog-articles.statuses.${status}`),
    }));
  }

  private getStatusBadgeClass(status: ContentStatus): string {
    const classes: Record<ContentStatus, string> = {
      draft: 'text-info bg-info-subtle',
      pending_review: 'text-warning bg-warning-subtle',
      approved: 'text-success bg-success-subtle',
      rejected: 'text-danger bg-danger-subtle',
      outdated: 'text-secondary bg-secondary-subtle',
    };
    return classes[status] || 'text-secondary bg-secondary-subtle';
  }

  private buildArticleFilters(
    search: string | undefined,
    filters: FilterValue
  ): BlogArticleFilters {
    const articleFilters: BlogArticleFilters = {
      locale: this.currentLocale(),
    };

    if (search) {
      articleFilters.search = search;
    }

    if (filters['status']) {
      articleFilters.status = filters['status'] as ContentStatus;
    }

    if (filters['category']) {
      articleFilters.category = filters['category'];
    }

    if (filters['is_featured']) {
      articleFilters.is_featured = filters['is_featured'] === 'true';
    }

    return articleFilters;
  }

  private loadArticles(
    page: number,
    pageSize: number,
    filters?: BlogArticleFilters,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): void {
    this.contentService
      .getBlogArticles(page, pageSize, filters, sortField, sortDirection, this.currentLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.listManager.setData(
            response.data,
            response.meta.pagination.total,
            response.meta.pagination.pageCount
          );

          this.loadViewsForArticles(response.data);

        },
        error: (err) => {
          console.error('Error loading articles:', err);
          this.listManager.setError();
          this.toastService.showError(
            this.translate.instant('blog-articles.error.loading')
          );
        },
      });
  }

  private loadViewsForArticles(articles: BlogArticle[]): void {
    if (!articles || articles.length === 0) {
      return;
    }

    this.contentService
      .getMultipleArticlesViewsCounts('blog', articles, this.currentLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.viewsStats.set(stats);
        },
        error: (err) => {
          console.error('Error loading views stats:', err);
        },
      });
  }

  onActionClick(event: { action: ListAction<BlogArticle>; row: BlogArticle }): void {
    event.action.handler(event.row);
  }

  onRowClick(article: BlogArticle): void {
    this.viewArticle(article);
  }

  viewArticle(article: BlogArticle): void {
    this.offcanvasService.open(
      {
        mode: 'view',
        articleId: article.documentId,
        locale: article.locale
      },
      () => {}
    );
  }


  editArticle(article: BlogArticle): void {
    this.offcanvasService.open(
      {
        mode: 'edit',
        articleId: article.documentId,
        locale: article.locale
      },
      (articleId) => {
        this.listManager.reload();
      }
    );
  }

  createTranslation(article: BlogArticle): void {
    const existingLocales = [
      article.locale,
      ...(article.localizations?.map(l => l.locale) || [])
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
        this.translate.instant('blog-articles.messages.all_translations_exist')
      );
      return;
    }

    if (availableLocales.length === 1) {
      this.openCreateTranslationOffcanvas(article.documentId!, availableLocales[0].code);
      return;
    }

    this.localeSelectorService.open(availableLocales, (selectedLocale) => {
      this.openCreateTranslationOffcanvas(article.documentId!, selectedLocale);
    });
  }

  private openCreateTranslationOffcanvas(sourceDocumentId: string, targetLocale: string): void {
    this.offcanvasService.open(
      {
        mode: 'create',
        locale: targetLocale,
        sourceDocumentId
      },
      (articleId) => {
        this.listManager.reload();
        this.toastService.showSuccess(
          this.translate.instant('blog-articles.messages.translation_created')
        );
      }
    );
  }

  viewTranslations(article: BlogArticle): void {

    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === article.locale);
    allTranslations.push({
      locale: article.locale!,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || article.locale!.toUpperCase(),
      documentId: article.documentId!
    });

    if (article.localizations && article.localizations.length > 0) {
      article.localizations.forEach(loc => {
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
        this.translate.instant('blog-articles.translations_modal.no_translations')
      );
      return;
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.onTranslationSelected(translation);
    });
  }

  private onTranslationSelected(translation: TranslationOption): void {
    this.offcanvasService.open(
      {
        mode: 'edit',
        articleId: translation.documentId,
        locale: translation.locale
      },
      (articleId) => {
        this.listManager.reload();
        this.toastService.showSuccess(
          this.translate.instant('blog-articles.messages.translation_opened')
        );
      }
    );
  }

  deleteArticle(article: BlogArticle): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('blog-articles.delete.title'),
        message: this.translate.instant('blog-articles.delete.message', {
          title: article.title,
        }),
        confirmText: this.translate.instant('blog-articles.delete.confirm'),
        cancelText: this.translate.instant('blog-articles.delete.cancel'),
        confirmClass: 'btn-danger',
        icon: 'delete',
        iconClass: 'text-danger',
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.contentService
            .deleteBlogArticle(article.documentId, article.locale)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.showSuccess(
                  this.translate.instant('blog-articles.delete.success')
                );
                this.listManager.reload();
              },
              error: (err) => {
                console.error('Error deleting article:', err);
                this.toastService.showError(
                  this.translate.instant('blog-articles.delete.error')
                );
              },
            });
        }
      });
  }

  approveArticle(article: BlogArticle): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('blog-articles.approve.title'),
        message: this.translate.instant('blog-articles.approve.message', {
          title: article.title,
        }),
        confirmText: this.translate.instant('blog-articles.approve.confirm'),
        cancelText: this.translate.instant('blog-articles.approve.cancel'),
        confirmClass: 'btn-success',
        icon: 'check_circle',
        iconClass: 'text-success',
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.contentService
            .reviewBlogArticle(article.documentId, 'approve')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.showSuccess(
                  this.translate.instant('blog-articles.approve.success')
                );
                this.listManager.reload();
              },
              error: (err) => {
                console.error('Error approving article:', err);
                this.toastService.showError(
                  this.translate.instant('blog-articles.approve.error')
                );
              },
            });
        }
      });
  }

  rejectArticle(article: BlogArticle): void {
    this.confirmDialog
      .open({
        title: this.translate.instant('blog-articles.reject.title'),
        message: this.translate.instant('blog-articles.reject.message', {
          title: article.title,
        }),
        confirmText: this.translate.instant('blog-articles.reject.confirm'),
        cancelText: this.translate.instant('blog-articles.reject.cancel'),
        confirmClass: 'btn-danger',
        icon: 'cancel',
        iconClass: 'text-danger',
      })
      .then((confirmed: boolean) => {
        if (confirmed) {
          this.contentService
            .reviewBlogArticle(article.documentId, 'reject')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toastService.showSuccess(
                  this.translate.instant('blog-articles.reject.success')
                );
                this.listManager.reload();
              },
              error: (err) => {
                console.error('Error rejecting article:', err);
                this.toastService.showError(
                  this.translate.instant('blog-articles.reject.error')
                );
              },
            });
        }
      });
  }

  openCreateOffcanvas(): void {
    this.offcanvasService.open(
      {
        mode: 'create',
        locale: this.currentLocale()
      },
      (articleId) => {
        this.listManager.reload();
      }
    );
  }

}
