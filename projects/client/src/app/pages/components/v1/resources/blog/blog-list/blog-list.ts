import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject, Observable, timer, finalize } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';
import {ChoicesSelectComponent, SelectOption} from '../../../../../../core/modules/choices/choices-select.component';
import {ActivatedRoute, Params, Router, RouterLink} from '@angular/router';
import {ApiSearchResponse, BlogArticle, BlogCategory, BlogResponse, BlogTag} from '../../../../../models/blog.model';
import {ChoicesConfig} from '../../../../../../core/modules/choices/choices.directive';
import {BlogService} from '../../../../../services/blog.service';
import {LanguageService} from '../../../../../../core/services/language.service';
import {environment} from '../../../../../../../environments/environment';



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
  // Subjects pour la gestion des subscriptions
  private destroy$ = new Subject<void>();
  // Utiliser un Subject simple pour éviter l'émission initiale non désirée
  private searchSubject = new Subject<string>();

  // État du composant
  private initialDataLoaded = false;
  private pendingParams: Params | null = null;

  // Données
  public articles: BlogArticle[] = [];
  public categories: BlogCategory[] = [];
  public tags: BlogTag[] = [];
  public featuredArticles: BlogArticle[] = [];

  // État courant des filtres
  public currentCategory: BlogCategory | null = null;
  public currentTag: BlogTag | null = null;
  public searchQuery = '';
  public sortBy: 'newest' | 'oldest' | 'title' = 'newest';

  // Valeurs pour les selects (ngModel)
  public selectedCategorySlug: string = '';
  public selectedTagSlug: string = '';

  // État UI
  public isLoading = false;
  public totalArticles = 0;
  public pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  } | null = null;

  // Options pour les dropdowns
  public categoryOptions: SelectOption[] = [];
  public tagOptions: SelectOption[] = [];
  public sortOptions: SelectOption[] = [];

  // Configurations Choices
  public categoryConfig: ChoicesConfig = {};
  public tagConfig: ChoicesConfig = {};
  public sortConfig: ChoicesConfig = {};

  constructor(
    private blogService: BlogService,
    private languageService: LanguageService,
    private translateService: TranslateService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  public ngOnInit(): void {
    this.updateTranslatedContent();
    this.setupLanguageListener();
    this.setupSearchListener();
    this.setupRouteListener();
    this.loadInitialData();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.blogService.clearState();
  }

  private updateTranslatedContent(): void {
    this.categoryConfig = { ...this.categoryConfig, placeholderValue: this.translateService.instant('blog.categories') };
    this.tagConfig = { ...this.tagConfig, searchEnabled: true, placeholderValue: this.translateService.instant('blog.tags') };
    this.sortConfig = { ...this.sortConfig, placeholderValue: this.translateService.instant('blog.sortBy') };

    this.buildSortOptions();
    this.buildCategoryOptions();
    this.buildTagOptions();
  }

  private setupRouteListener(): void {
    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (this.initialDataLoaded) {
        this.processRouteParams(params);
      } else {
        this.pendingParams = params;
      }
    });
  }

  private setupLanguageListener(): void {
    this.languageService.languageChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateTranslatedContent();
      const currentCategoryId = this.currentCategory?.id;
      const currentTagId = this.currentTag?.id;

      forkJoin({
        categories: this.blogService.getCategories(),
        tags: this.blogService.getTags(),
        featured: this.blogService.getFeaturedArticles(6)
      }).subscribe(({ categories, tags, featured }) => {
        this.categories = categories;
        this.tags = tags;
        if (featured?.data) this.featuredArticles = featured.data;

        this.buildCategoryOptions();
        this.buildTagOptions();

        const queryParamsToUpdate: { [key: string]: string | undefined } = {};
        let needsNavigation = false;

        if (currentCategoryId) {
          const newCategory = this.categories.find(c => c.id === currentCategoryId);
          queryParamsToUpdate['category'] = newCategory ? newCategory.slug : undefined;
          needsNavigation = true;
        }
        if (currentTagId) {
          const newTag = this.tags.find(t => t.id === currentTagId);
          queryParamsToUpdate['tag'] = newTag ? newTag.slug : undefined;
          needsNavigation = true;
        }

        if (needsNavigation) {
          this.router.navigate([], { relativeTo: this.activatedRoute, queryParams: queryParamsToUpdate, queryParamsHandling: 'merge', replaceUrl: true });
        } else {
          this.processRouteParams(this.activatedRoute.snapshot.queryParams);
        }
      });
    });
  }

  private loadInitialData(): void {
    forkJoin({
      categories: this.blogService.getCategories(),
      tags: this.blogService.getTags(),
      featured: this.blogService.getFeaturedArticles(6)
    }).pipe(takeUntil(this.destroy$)).subscribe(({ categories, tags, featured }) => {
      this.categories = categories;
      this.tags = tags;
      if (featured?.data) this.featuredArticles = featured.data;

      this.buildCategoryOptions();
      this.buildTagOptions();
      this.initialDataLoaded = true;

      if (this.pendingParams) {
        this.processRouteParams(this.pendingParams);
        this.pendingParams = null;
      }
    });
  }

  private processRouteParams(params: Params): void {
    const page = parseInt(params['page']) || 1;
    const categorySlug = params['category'];
    const tagSlug = params['tag'];
    const search = params['search'];

    this.searchQuery = search || '';
    this.selectedCategorySlug = categorySlug || '';
    this.selectedTagSlug = tagSlug || '';

    this.currentCategory = this.categories.find(c => c.slug === categorySlug) || null;
    this.currentTag = this.tags.find(t => t.slug === tagSlug) || null;

    this.loadArticles(page, categorySlug, tagSlug, search);
  }

  private loadArticles(page: number = 1, categorySlug?: string, tagSlug?: string, searchQuery?: string): void {
    this.isLoading = true;
    let articlesObservable: Observable<BlogResponse | ApiSearchResponse | null>;

    if (searchQuery) {
      articlesObservable = this.blogService.searchArticles(searchQuery, 20);
    } else if (categorySlug) {
      articlesObservable = this.blogService.getArticlesByCategory(categorySlug, page);
    } else if (tagSlug) {
      articlesObservable = this.blogService.getArticlesByTag(tagSlug, page);
    } else {
      articlesObservable = this.blogService.getAllArticles(page);
    }

    const minimumWait$ = timer(400);
    forkJoin({ response: articlesObservable, wait: minimumWait$ })
      .pipe(finalize(() => { this.isLoading = false; }), takeUntil(this.destroy$))
      .subscribe(({ response }) => {
        if (response && response.data) {
          this.articles = this.sortArticles(response.data as BlogArticle[], this.sortBy);
          if (response.meta && 'pagination' in response.meta) {
            this.pagination = response.meta.pagination;
            this.totalArticles = response.meta.pagination.total;
          } else if (response.meta && 'total' in response.meta) {
            this.pagination = null;
            this.totalArticles = response.meta.total;
          } else {
            this.pagination = null;
            this.totalArticles = (response.data as any[]).length;
          }
          this.articles = this.articles.map(article => ({ ...article, readTime: article.reading_time || this.blogService.calculateReadTime(article.content || article.excerpt || '') }));
        } else {
          this.articles = []; this.totalArticles = 0; this.pagination = null;
        }
      });
  }

  private buildCategoryOptions(): void {
    this.categoryOptions = [
      { value: '', label: this.translateService.instant('blog.allCategories') },
      ...this.categories.map(category => ({ value: category.slug, label: category.name }))
    ];
  }

  private buildTagOptions(): void {
    this.tagOptions = [
      { value: '', label: this.translateService.instant('blog.allTags') },
      ...this.tags.map(tag => ({ value: tag.slug, label: `#${tag.name}` }))
    ];
  }

  private buildSortOptions(): void {
    this.sortOptions = [
      { value: 'newest', label: this.translateService.instant('blog.sortOptions.newest') },
      { value: 'oldest', label: this.translateService.instant('blog.sortOptions.oldest') },
      { value: 'title', label: this.translateService.instant('blog.sortOptions.title') }
    ];
  }

  // --- LOGIQUE DE NAVIGATION CORRIGÉE ET SIMPLIFIÉE ---

  private setupSearchListener(): void {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { search: query || undefined }
      });
    });
  }

  public onCategoryChange(categorySlug: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { category: categorySlug || undefined }
    });
  }

  public onTagChange(tagSlug: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { tag: tagSlug || undefined }
    });
  }

  public clearCategoryFilter(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { category: undefined },
      queryParamsHandling: 'merge'
    });
  }

  public clearTagFilter(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { tag: undefined },
      queryParamsHandling: 'merge'
    });
  }

  public clearSearchFilter(): void {
    this.searchQuery = '';
    this.searchSubject.next(''); // Émettre une chaîne vide pour déclencher le listener
  }

  public clearAllFilters(): void {
    this.router.navigate([], { relativeTo: this.activatedRoute });
  }

  public goToPage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { page: page },
      queryParamsHandling: 'merge'
    });
  }

  public onSortChange(): void {
    this.articles = this.sortArticles(this.articles, this.sortBy);
  }

  private sortArticles(articles: BlogArticle[], sortBy: string): BlogArticle[] {
    const sortedArticles = [...articles];
    switch (sortBy) {
      case 'newest': return sortedArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      case 'oldest': return sortedArticles.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      case 'title': return sortedArticles.sort((a, b) => a.title.localeCompare(b.title));
      default: return sortedArticles;
    }
  }

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  public filterByTag(tag: BlogTag): void {
    this.onTagChange(tag.slug);
  }

  public getVisiblePages(): (number | string)[] {
    if (!this.pagination) return [];
    const currentPage = this.pagination.page;
    const totalPages = this.pagination.pageCount;
    const pages: (number | string)[] = [];
    const pageNeighbours = 1;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > pageNeighbours + 2) pages.push('...');
    const startPage = Math.max(2, currentPage - pageNeighbours);
    const endPage = Math.min(totalPages - 1, currentPage + pageNeighbours);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    if (currentPage < totalPages - (pageNeighbours + 1)) pages.push('...');
    pages.push(totalPages);

    return pages;
  }

  public formatDate(date: string): string {
    return this.blogService.formatPublishedDate(date);
  }

  protected readonly environment = environment;
}
