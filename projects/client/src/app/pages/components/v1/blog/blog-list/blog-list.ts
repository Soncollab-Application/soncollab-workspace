import {Component, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject, debounceTime, distinctUntilChanged, Observable, Subject, takeUntil} from 'rxjs';
import {BlogArticle, BlogCategory, BlogResponse, BlogTag} from '../../../../models/blog.model';
import {BlogService} from '../../../../services/blog.service';
import {LanguageService} from '../../../../../core/services/language.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';
import {ChoicesSelectComponent, SelectOption} from '../../../../../core/modules/choices/choices-select.component';
import {ChoicesConfig} from '../../../../../core/modules/choices/choices.directive';

@Component({
  selector: 'app-blog-list',
  imports: [
    RouterLink,
    TranslatePipe,
    FormsModule,
    ChoicesSelectComponent
  ],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.css'
})
export class BlogList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State existant
  articles: BlogArticle[] = [];
  categories: BlogCategory[] = [];
  featuredArticles: BlogArticle[] = [];
  currentCategory: BlogCategory | null = null;
  currentTag: BlogTag | null = null;
  isLoading = false;
  searchQuery = '';
  totalArticles = 0;
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  } | null = null;
  tags: BlogTag[] = [];
  sortBy: 'newest' | 'oldest' | 'title' = 'newest';
  private searchSubject = new BehaviorSubject<string>('');

  // Propriétés pour les Choices Select
  selectedCategorySlug: string = '';
  selectedTagSlug: string = '';

  // Options pour les dropdowns
  categoryOptions: SelectOption[] = [];
  tagOptions: SelectOption[] = [];
  sortOptions: SelectOption[] = [];

  // Configurations Choices
  categoryConfig: ChoicesConfig = {
    searchEnabled: false,
    placeholder: true,
    placeholderValue: '',
    allowHTML: false,
    shouldSort: false,
    removeItemButton: false
  };

  tagConfig: ChoicesConfig = {
    searchEnabled: true,
    placeholder: true,
    placeholderValue: '',
    allowHTML: false,
    shouldSort: false,
    removeItemButton: false
  };

  sortConfig: ChoicesConfig = {
    searchEnabled: false,
    placeholder: false,
    allowHTML: false,
    shouldSort: false,
    removeItemButton: false
  };

  constructor(
    private blogService: BlogService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.initializeSortOptions();
    this.updatePlaceholders();
    this.setupLanguageListener();
    this.setupRouteListener();
    this.setupSearchListener();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.blogService.clearState();
  }

  // Initialisation des options de tri
  private initializeSortOptions(): void {
    this.sortOptions = [
      {
        value: 'newest',
        label: this.translateService.instant('blog.sortOptions.newest')
      },
      {
        value: 'oldest',
        label: this.translateService.instant('blog.sortOptions.oldest')
      },
      {
        value: 'title',
        label: this.translateService.instant('blog.sortOptions.title')
      }
    ];
  }

  private setupLanguageListener(): void {
    this.languageService.languageChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadInitialData();
        this.updatePlaceholders();
        this.initializeSortOptions();
      });
  }

  // Mise à jour des placeholders lors du changement de langue
  private updatePlaceholders(): void {
    this.categoryConfig = {
      ...this.categoryConfig,
      placeholderValue: this.translateService.instant('blog.categories')
    };
    this.tagConfig = {
      ...this.tagConfig,
      placeholderValue: this.translateService.instant('blog.tags')
    };
  }

  private setupRouteListener(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const page = parseInt(params['page']) || 1;
        const category = params['category'];
        const tag = params['tag'];
        const search = params['search'];

        this.searchQuery = search || '';
        this.selectedCategorySlug = category || '';
        this.selectedTagSlug = tag || '';

        // Mettre à jour les références aux objets actuels
        this.currentCategory = category ? this.categories.find(c => c.slug === category) || null : null;
        this.currentTag = tag ? this.tags.find(t => t.slug === tag) || null : null;

        this.loadArticles(page, category, tag, search);
      });
  }

  private setupSearchListener(): void {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: query || null, page: null },
        queryParamsHandling: 'merge'
      });
    });
  }

  private loadInitialData(): void {
    // Charger les catégories
    this.blogService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
        this.buildCategoryOptions();
      });

    // Charger les tags
    this.blogService.getTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tags => {
        this.tags = tags;
        this.buildTagOptions();
      });

    // Charger les articles en vedette
    this.blogService.getFeaturedArticles(6)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        if (response?.data) {
          this.featuredArticles = response.data;
        }
      });
  }

  // Construction des options pour les dropdowns
  private buildCategoryOptions(): void {
    this.categoryOptions = [
      {
        value: '',
        label: this.translateService.instant('blog.categories')
      },
      ...this.categories.map(category => ({
        value: category.slug,
        label: category.name
      }))
    ];
  }

  private buildTagOptions(): void {
    this.tagOptions = [
      {
        value: '',
        label: this.translateService.instant('blog.tags')
      },
      ...this.tags.map(tag => ({
        value: tag.slug,
        label: `#${tag.name}`
      }))
    ];
  }

  // Méthodes pour gérer les changements de sélection
  onCategoryChange(categorySlug: string): void {
    if (categorySlug) {
      const category = this.categories.find(c => c.slug === categorySlug);
      if (category) {
        this.filterByCategory(category);
      }
    } else {
      this.clearCategoryFilter();
    }
  }

  onTagChange(tagSlug: string): void {
    if (tagSlug) {
      const tag = this.tags.find(t => t.slug === tagSlug);
      if (tag) {
        this.filterByTag(tag);
      }
    } else {
      this.clearTagFilter();
    }
  }

  onSortChange(): void {
    // Re-trier les articles selon le nouveau critère
    this.articles = this.sortArticles(this.articles, this.sortBy);
  }

  private sortArticles(articles: BlogArticle[], sortBy: string): BlogArticle[] {
    const sorted = [...articles];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  }

  clearSearchFilter(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  private loadArticles(page: number = 1, categorySlug?: string, tagSlug?: string, searchQuery?: string): void {
    this.isLoading = true;

    if (searchQuery) {
      this.blogService.searchArticles(searchQuery, 20)
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          this.isLoading = false;
          if (response && response.data) {
            this.articles = response.data;
            this.totalArticles = response.meta?.total || response.data.length;
            this.pagination = null;
            this.articles = this.articles.map(article => ({
              ...article,
              readTime: article.readTime || this.blogService.calculateReadTime(article.content || article.excerpt || '')
            }));
          } else {
            this.articles = [];
            this.totalArticles = 0;
            this.pagination = null;
          }
        });
    } else {
      let articlesObservable: Observable<BlogResponse | null>;

      if (categorySlug) {
        articlesObservable = this.blogService.getArticlesByCategory(categorySlug, page);
      } else if (tagSlug) {
        articlesObservable = this.blogService.getArticlesByTag(tagSlug, page);
      } else {
        articlesObservable = this.blogService.getAllArticles(page);
      }

      articlesObservable
        .pipe(takeUntil(this.destroy$))
        .subscribe(response => {
          this.isLoading = false;
          if (response && response.data) {
            this.articles = response.data;
            if (response.meta && response.meta.pagination) {
              this.pagination = response.meta.pagination;
              this.totalArticles = response.meta.pagination.total;
            } else {
              this.pagination = null;
              this.totalArticles = response.data.length;
            }
            this.articles = this.articles.map(article => ({
              ...article,
              readTime: article.readTime || this.blogService.calculateReadTime(article.content || article.excerpt || '')
            }));
          } else {
            this.articles = [];
            this.totalArticles = 0;
            this.pagination = null;
          }
        });
    }
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  filterByCategory(category: BlogCategory): void {
    this.currentCategory = category;
    this.currentTag = null;
    this.selectedTagSlug = '';
    this.blogService.setCurrentCategory(category);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: category.slug,
        tag: null,
        search: null,
        page: null
      },
      queryParamsHandling: 'merge'
    });
  }

  filterByTag(tag: BlogTag): void {
    this.currentTag = tag;
    this.currentCategory = null;
    this.selectedCategorySlug = '';
    this.blogService.setCurrentTag(tag);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tag: tag.slug,
        category: null,
        search: null,
        page: null
      },
      queryParamsHandling: 'merge'
    });
  }

  clearCategoryFilter(): void {
    this.currentCategory = null;
    this.selectedCategorySlug = '';
    this.blogService.setCurrentCategory(null);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null, page: null },
      queryParamsHandling: 'merge'
    });
  }

  clearTagFilter(): void {
    this.currentTag = null;
    this.selectedTagSlug = '';
    this.blogService.setCurrentTag(null);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tag: null, page: null },
      queryParamsHandling: 'merge'
    });
  }

  clearAllFilters(): void {
    this.currentCategory = null;
    this.currentTag = null;
    this.searchQuery = '';
    this.selectedCategorySlug = '';
    this.selectedTagSlug = '';
    this.blogService.setCurrentCategory(null);
    this.blogService.setCurrentTag(null);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null, tag: null, search: null, page: null }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || (this.pagination && page > this.pagination.pageCount)) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page },
      queryParamsHandling: 'merge'
    });
  }

  getVisiblePages(): number[] {
    if (!this.pagination) return [];

    const current = this.pagination.page;
    const total = this.pagination.pageCount;
    const delta = 2;

    const pages: number[] = [];
    const rangeStart = Math.max(2, current - delta);
    const rangeEnd = Math.min(total - 1, current + delta);

    if (total <= 1) return [];

    // Always include first page
    pages.push(1);

    // Add ellipsis if needed
    if (rangeStart > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add pages around current
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (i !== 1 && i !== total) {
        pages.push(i);
      }
    }

    // Add ellipsis if needed
    if (rangeEnd < total - 1) {
      pages.push(-1);
    }

    // Always include last page if more than 1 page
    if (total > 1) {
      pages.push(total);
    }

    return pages.filter(p => p !== -1); // Remove ellipsis for now
  }

  formatDate(date: string): string {
    return this.blogService.formatPublishedDate(date);
  }
}
