import { Component, OnDestroy, OnInit, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, forkJoin, Subject, Observable, timer, finalize } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BlogArticle, BlogCategory, BlogResponse, BlogTag, ApiSearchResponse } from '../../../../models/blog.model';
import { BlogService } from '../../../../services/blog.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { ActivatedRoute, Router, RouterLink, Params } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ChoicesSelectComponent, SelectOption } from '../../../../../core/modules/choices/choices-select.component';
import { ChoicesConfig } from '../../../../../core/modules/choices/choices.directive';
import { environment } from '../../../../../../environments/environment';

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
  // ViewChildren pour accéder aux composants choices-select
  @ViewChildren(ChoicesSelectComponent) choicesSelects!: QueryList<ChoicesSelectComponent>;

  // Subjects pour la gestion des subscriptions
  private destroy$ = new Subject<void>();
  private searchSubject = new BehaviorSubject<string>('');

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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  public ngOnInit(): void {
    this.initializeConfigurations();
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

  /**
   * Initialise les configurations de base des dropdowns
   */
  private initializeConfigurations(): void {
    this.categoryConfig = {
      searchEnabled: false,
      allowHTML: true,
      searchPlaceholderValue: this.getTranslation('common.search.placeholder', 'Rechercher...'),
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      noResultsText: this.getTranslation('common.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('common.search.noChoices', 'Aucun choix disponible'),
      classNames: { containerInner: "form-select" },
      placeholderValue: this.getTranslation('blog.allCategories', 'Toutes les catégories')
    };

    this.tagConfig = {
      searchEnabled: true,
      allowHTML: true,
      searchPlaceholderValue: this.getTranslation('common.search.placeholder', 'Rechercher...'),
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      noResultsText: this.getTranslation('common.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('common.search.noChoices', 'Aucun choix disponible'),
      classNames: { containerInner: "form-select" },
      placeholderValue: this.getTranslation('blog.allTags', 'Tous les tags')
    };

    this.sortConfig = {
      searchEnabled: false,
      allowHTML: true,
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      classNames: { containerInner: "form-select" }
    };

    this.buildSortOptions();
  }

  /**
   * Configure l'écoute des changements de langue
   */
  private setupLanguageListener(): void {
    this.languageService.languageChanged$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Sauvegarder les IDs actuels pour pouvoir les mapper après le changement de langue
      const currentCategoryId = this.currentCategory?.id;
      const currentTagId = this.currentTag?.id;

      // Mettre à jour les configurations avec les nouvelles traductions
      this.updateConfigurations();

      // Recharger les données avec les nouvelles traductions
      this.reloadDataForLanguageChange(currentCategoryId, currentTagId);
    });
  }

  /**
   * Met à jour les configurations avec les nouvelles traductions
   */
  private updateConfigurations(): void {
    this.categoryConfig = {
      ...this.categoryConfig,
      placeholderValue: this.getTranslation('blog.allCategories', 'Toutes les catégories'),
      searchPlaceholderValue: this.getTranslation('common.search.placeholder', 'Rechercher...'),
      noResultsText: this.getTranslation('common.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('common.search.noChoices', 'Aucun choix disponible')
    };

    this.tagConfig = {
      ...this.tagConfig,
      placeholderValue: this.getTranslation('blog.allTags', 'Tous les tags'),
      searchPlaceholderValue: this.getTranslation('common.search.placeholder', 'Rechercher...'),
      noResultsText: this.getTranslation('common.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('common.search.noChoices', 'Aucun choix disponible')
    };

    // Reconstruire les options de tri avec les nouvelles traductions
    this.buildSortOptions();

    // Déclencher la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Recharge les données après un changement de langue
   */
  private reloadDataForLanguageChange(currentCategoryId?: number, currentTagId?: number): void {
    forkJoin({
      categories: this.blogService.getCategories(),
      tags: this.blogService.getTags(),
      featured: this.blogService.getFeaturedArticles(6)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ categories, tags, featured }) => {
      // Mettre à jour les données
      this.categories = categories;
      this.tags = tags;
      if (featured?.data) {
        this.featuredArticles = featured.data;
      }

      // Reconstruire les options avec les nouvelles données
      this.buildCategoryOptions();
      this.buildTagOptions();

      // Forcer la mise à jour des composants choices-select
      this.forceUpdateChoicesSelects();

      // Gérer les paramètres URL après changement de langue
      this.handleLanguageChangeUrlMapping(currentCategoryId, currentTagId);
    });
  }

  /**
   * Force la mise à jour de tous les composants choices-select
   */
  private forceUpdateChoicesSelects(): void {
    // Attendre que les changements soient appliqués
    setTimeout(() => {
      this.choicesSelects?.forEach(select => {
        if (select && typeof select.forceUpdate === 'function') {
          select.forceUpdate();
        }
      });
    }, 100);
  }

  /**
   * Gère le mapping des URLs après changement de langue
   */
  private handleLanguageChangeUrlMapping(currentCategoryId?: number, currentTagId?: number): void {
    const queryParamsToUpdate: { [key: string]: string | null } = {};
    let needsNavigation = false;

    // Mapper l'ancienne catégorie vers la nouvelle slug
    if (currentCategoryId) {
      const newCategory = this.categories.find(c => c.id === currentCategoryId);
      if (newCategory && newCategory.slug !== this.selectedCategorySlug) {
        queryParamsToUpdate['category'] = newCategory.slug;
        this.selectedCategorySlug = newCategory.slug;
        this.currentCategory = newCategory;
        needsNavigation = true;
      } else if (!newCategory) {
        queryParamsToUpdate['category'] = null;
        this.selectedCategorySlug = '';
        this.currentCategory = null;
        needsNavigation = true;
      }
    }

    // Mapper l'ancien tag vers la nouvelle slug
    if (currentTagId) {
      const newTag = this.tags.find(t => t.id === currentTagId);
      if (newTag && newTag.slug !== this.selectedTagSlug) {
        queryParamsToUpdate['tag'] = newTag.slug;
        this.selectedTagSlug = newTag.slug;
        this.currentTag = newTag;
        needsNavigation = true;
      } else if (!newTag) {
        queryParamsToUpdate['tag'] = null;
        this.selectedTagSlug = '';
        this.currentTag = null;
        needsNavigation = true;
      }
    }

    // Naviguer vers la nouvelle URL si nécessaire
    if (needsNavigation) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: queryParamsToUpdate,
        queryParamsHandling: 'merge',
        replaceUrl: true // Éviter de créer une nouvelle entrée dans l'historique
      });
    } else {
      // Sinon, traiter les paramètres actuels
      this.processRouteParams(this.activatedRoute.snapshot.queryParams);
    }
  }

  /**
   * Configure l'écoute des paramètres de route
   */
  private setupRouteListener(): void {
    this.activatedRoute.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (this.initialDataLoaded) {
        this.processRouteParams(params);
      } else {
        this.pendingParams = params;
      }
    });
  }

  /**
   * Configure l'écoute des changements de recherche
   */
  private setupSearchListener(): void {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: {
          search: query || null,
          page: query ? 1 : null, // Reset à la page 1 lors d'une recherche
          category: null, // Reset les filtres lors d'une recherche
          tag: null
        },
        queryParamsHandling: 'merge'
      });
    });
  }

  /**
   * Charge les données initiales
   */
  private loadInitialData(): void {
    forkJoin({
      categories: this.blogService.getCategories(),
      tags: this.blogService.getTags(),
      featured: this.blogService.getFeaturedArticles(6)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ categories, tags, featured }) => {
      this.categories = categories;
      this.tags = tags;
      if (featured?.data) {
        this.featuredArticles = featured.data;
      }

      this.buildCategoryOptions();
      this.buildTagOptions();

      this.initialDataLoaded = true;

      // Traiter les paramètres en attente
      if (this.pendingParams) {
        this.processRouteParams(this.pendingParams);
        this.pendingParams = null;
      }
    });
  }

  /**
   * Traite les paramètres de route
   */
  private processRouteParams(params: Params): void {
    const page = parseInt(params['page']) || 1;
    const categorySlug = params['category'];
    const tagSlug = params['tag'];
    const search = params['search'];

    // Mettre à jour l'état local
    this.searchQuery = search || '';
    this.selectedCategorySlug = categorySlug || '';
    this.selectedTagSlug = tagSlug || '';

    // Mettre à jour les objets courants
    this.currentCategory = categorySlug ?
      this.categories.find(c => c.slug === categorySlug) || null : null;
    this.currentTag = tagSlug ?
      this.tags.find(t => t.slug === tagSlug) || null : null;

    // Charger les articles
    this.loadArticles(page, categorySlug, tagSlug, search);
  }

  /**
   * Charge les articles selon les filtres
   */
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

    forkJoin({
      response: articlesObservable,
      wait: minimumWait$
    }).pipe(
      finalize(() => {
        this.isLoading = false;
      }),
      takeUntil(this.destroy$)
    ).subscribe(({ response }) => {
      if (response && response.data) {
        this.articles = this.sortArticles(response.data as BlogArticle[], this.sortBy);

        // Gérer la pagination
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

        // Ajouter le temps de lecture
        this.articles = this.articles.map(article => ({
          ...article,
          readTime: article.reading_time ||
            this.blogService.calculateReadTime(article.content || article.excerpt || '')
        }));
      } else {
        this.resetArticlesList();
      }
    });
  }

  /**
   * Remet à zéro la liste des articles
   */
  private resetArticlesList(): void {
    this.articles = [];
    this.totalArticles = 0;
    this.pagination = null;
  }

  /**
   * Construit les options pour le dropdown des catégories
   */
  private buildCategoryOptions(): void {
    this.categoryOptions = [
      {
        value: '',
        label: this.getTranslation('blog.allCategories', 'Toutes les catégories')
      },
      ...this.categories.map(category => ({
        value: category.slug,
        label: category.name
      }))
    ];

    // Déclencher la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Construit les options pour le dropdown des tags
   */
  private buildTagOptions(): void {
    this.tagOptions = [
      {
        value: '',
        label: this.getTranslation('blog.allTags', 'Tous les tags')
      },
      ...this.tags.map(tag => ({
        value: tag.slug,
        label: `#${tag.name}`
      }))
    ];

    // Déclencher la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Construit les options pour le dropdown de tri
   */
  private buildSortOptions(): void {
    this.sortOptions = [
      {
        value: 'newest',
        label: this.getTranslation('blog.sortOptions.newest', 'Plus récent')
      },
      {
        value: 'oldest',
        label: this.getTranslation('blog.sortOptions.oldest', 'Plus ancien')
      },
      {
        value: 'title',
        label: this.getTranslation('blog.sortOptions.title', 'Titre A-Z')
      }
    ];

    // Déclencher la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Utilitaire pour récupérer une traduction avec fallback
   */
  private getTranslation(key: string, fallback?: string): string {
    const translation = this.translateService.instant(key);
    return translation !== key ? translation : (fallback || key);
  }

  /**
   * Gère le changement de catégorie
   */
  public onCategoryChange(categorySlug: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        category: categorySlug || null,
        tag: null, // Reset le tag lors du changement de catégorie
        page: 1,
        search: null // Reset la recherche
      },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Gère le changement de tag
   */
  public onTagChange(tagSlug: string): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        tag: tagSlug || null,
        category: null, // Reset la catégorie lors du changement de tag
        page: 1,
        search: null // Reset la recherche
      },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Gère le changement de tri
   */
  public onSortChange(): void {
    this.articles = this.sortArticles(this.articles, this.sortBy);
  }

  /**
   * Trie les articles selon le critère spécifié
   */
  private sortArticles(articles: BlogArticle[], sortBy: string): BlogArticle[] {
    const sortedArticles = [...articles];
    switch (sortBy) {
      case 'newest':
        return sortedArticles.sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      case 'oldest':
        return sortedArticles.sort((a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
        );
      case 'title':
        return sortedArticles.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sortedArticles;
    }
  }

  /**
   * Gère la saisie dans le champ de recherche
   */
  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  /**
   * Filtre par tag (appelé depuis le template)
   */
  public filterByTag(tag: BlogTag): void {
    this.onTagChange(tag.slug);
  }

  /**
   * Efface le filtre de catégorie
   */
  public clearCategoryFilter(): void {
    this.onCategoryChange('');
  }

  /**
   * Efface le filtre de tag
   */
  public clearTagFilter(): void {
    this.onTagChange('');
  }

  /**
   * Efface le filtre de recherche
   */
  public clearSearchFilter(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  /**
   * Efface tous les filtres
   */
  public clearAllFilters(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {}
    });
  }

  /**
   * Navigue vers une page spécifique
   */
  public goToPage(page: number): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { page: page },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Calcule les pages visibles pour la pagination
   */
  public getVisiblePages(): number[] {
    if (!this.pagination || this.pagination.pageCount <= 1) return [];

    const maxVisiblePages = 5;
    const currentPage = this.pagination.page;
    const totalPages = this.pagination.pageCount;
    const pages: number[] = [];

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  /**
   * Formate une date pour l'affichage
   */
  public formatDate(date: string): string {
    return this.blogService.formatPublishedDate(date);
  }

  // Exposition de l'environment pour le template
  protected readonly environment = environment;
}
