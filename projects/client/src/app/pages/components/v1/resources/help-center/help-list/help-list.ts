import { Component, OnDestroy, OnInit } from '@angular/core';
import {forkJoin, Subject, switchMap} from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HelpArticle, HelpCategory } from '../../../../../models/help.model';
import { HelpService } from '../../../../../services/help.service';
import { LanguageService } from '../../../../../../core/services/language.service';

@Component({
  selector: 'app-help-list',
  imports: [
    RouterLink,
    TranslatePipe,
    FormsModule,
    CommonModule
  ],
  templateUrl: './help-list.html',
  styleUrl: './help-list.css'
})
export class HelpList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  public categories: HelpCategory[] = [];
  public featuredArticles: HelpArticle[] = [];
  public faqArticles: HelpArticle[] = [];
  public searchResults: HelpArticle[] = [];
  public popularSearches: string[] = [];

  public isLoading = false;
  public isSearching = false;
  public showSearchResults = false;
  public searchQuery = '';
  public resultTitle = '';

  // État pour l'accordéon FAQ
  public faqAccordionStates: { [key: string]: boolean } = {};

  constructor(
    private helpService: HelpService,
    private languageService: LanguageService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private translateService: TranslateService
  ) {}

  public ngOnInit(): void {
    this.setupSearchListener();
    this.setupLanguageListener();
    this.loadInitialData();
    this.checkUrlParams();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private setupLanguageListener(): void {
    this.languageService.languageChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      const currentParams = this.activatedRoute.snapshot.queryParams;
      if (currentParams['search'] || currentParams['category']) {
        this.router.navigate(['/help']);
      } else {
        this.loadInitialData();
      }
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      categories: this.helpService.getCategories(),
      featured: this.helpService.getFeaturedArticles(8),
      faq: this.helpService.getAllArticles(1, 6),
      popularSearches: this.helpService.getPopularSearches(5)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    ).subscribe(({ categories, featured, faq, popularSearches }) => {
      this.categories = categories;
      this.popularSearches = popularSearches;

      if (featured?.data) {
        this.featuredArticles = featured.data.help;
      }
      if (faq?.data) {
        this.faqArticles = faq.data;
      }
    });
  }

  private setupSearchListener(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim()) {
        this.performSearch(query);
      } else {
        this.clearSearch();
      }
    });
  }

  private checkUrlParams(): void {
    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) {
        this.searchQuery = params['search'];
        this.performSearch(this.searchQuery);
      } else if (params['category']) {
        this.searchQuery = '';
        this.performCategoryFilter(params['category']);
      } else {
        this.clearSearchResults(false);
      }
    });
  }

  private performCategoryFilter(categorySlug: string): void {
    this.isLoading = true;
    const category = this.categories.find(c => c.slug === categorySlug);
    const categoryName = category ? category.name : categorySlug;

    this.translateService.get('help.articlesInCategory', { categoryName }).subscribe(title => {
      this.resultTitle = title;
    });

    this.helpService.getArticlesByCategory(categorySlug, 1, 20).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe(response => {
      this.searchResults = response?.data || [];
      this.showSearchResults = true;
    });
  }

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  public onSearchSubmit(): void {
    if (this.searchQuery.trim()) {
      this.performSearch(this.searchQuery);
      this.updateUrl({ search: this.searchQuery });
    }
  }

  public onPopularSearch(term: string): void {
    this.searchQuery = term;
    this.performSearch(term);
    this.updateUrl({ search: term });
  }

  private performSearch(query: string): void {
    this.isSearching = true;
    this.helpService.searchArticles(query, 20).pipe(
      takeUntil(this.destroy$)
    ).subscribe(response => {
      this.isSearching = false;
      if (response?.data) {
        this.searchResults = response.data;
        this.showSearchResults = true;
      } else {
        this.searchResults = [];
        this.showSearchResults = true;
      }
    });
  }

  private clearSearch(): void {
    this.showSearchResults = false;
    this.searchResults = [];
    this.updateUrl({ search: undefined });
  }

  private updateUrl(params: { [key: string]: string | undefined }): void {
    const currentParams = this.activatedRoute.snapshot.queryParams;
    const newParams = { ...currentParams, ...params };
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === undefined) {
        delete newParams[key];
      }
    });
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: newParams,
      replaceUrl: true
    });
  }

  public getCategoriesByGroup(startIndex: number, count: number): HelpCategory[] {
    return this.categories.slice(startIndex, startIndex + count);
  }

  public getCategoryColorClass(category: HelpCategory): string {
    const defaultColors = ['warning', 'info', 'primary', 'success', 'danger', 'secondary'];
    if (category.color && defaultColors.includes(category.color)) {
      return `bg-${category.color}-subtle`;
    }
    return `bg-${defaultColors[category.id % defaultColors.length]}-subtle`;
  }

  public navigateToCategory(category: HelpCategory): void {
    this.router.navigate(['/help'], {
      queryParams: { category: category.slug }
    });
  }

  public navigateToArticle(article: HelpArticle): void {
    this.router.navigate(['/help', article.slug]);
  }

  public getDifficultyClass(level: string): string {
    switch (level) {
      case 'beginner': return 'badge-success';
      case 'intermediate': return 'badge-warning';
      case 'advanced': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  public getDifficultyLabel(level: string): string {
    return this.translateService.instant(`help.${level}`);
  }

  public clearSearchResults(updateUrl = true): void {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.searchResults = [];
    this.resultTitle = '';
    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: {},
      });
    }
  }

  public toggleFaqAccordion(articleId: string): void {
    this.faqAccordionStates[articleId] = !this.faqAccordionStates[articleId];
  }

  public isFaqAccordionOpen(articleId: string): boolean {
    return this.faqAccordionStates[articleId] || false;
  }
}
