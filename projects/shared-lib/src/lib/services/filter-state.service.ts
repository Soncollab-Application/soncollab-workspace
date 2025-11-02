import { Injectable, signal, computed, inject } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FilterValue, SortConfig } from '../modules';

export interface FilterState {
  search: string;
  filters: FilterValue;
  sort: SortConfig;
  page: number;
}

@Injectable({
  providedIn: 'root'
})
export class FilterStateService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private _search = signal<string>('');
  private _filterValues = signal<FilterValue>({});
  private _currentSort = signal<SortConfig>({ field: '', direction: 'asc' });
  private _currentPage = signal<number>(1);
  private _initialized = signal<boolean>(false);
  private _lastLoadedFingerprint = '';
  private _currentComponentId: string = '';

  readonly state = computed<FilterState>(() => ({
    search: this._search(),
    filters: this._filterValues(),
    sort: this._currentSort(),
    page: this._currentPage()
  }));

  readonly stateFingerprint = computed(() => {
    const state = this.state();

    // Nettoyer et trier les filtres
    const sortedFilters: Record<string, any> = {};
    Object.keys(state.filters)
      .sort() // Tri alphabétique
      .forEach(key => {
        const value = state.filters[key];
        if (value !== null && value !== undefined && value !== '') {
          sortedFilters[key] = value;
        }
      });

    return JSON.stringify({
      page: state.page,
      search: state.search,
      filters: sortedFilters,
      sortField: state.sort.field,
      sortDirection: state.sort.direction
    });
  });

  readonly initialized = this._initialized.asReadonly();

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this._initialized()) {
          this.loadFromUrl();
        }
      });
  }

  initialize(defaultSort?: SortConfig, componentId?: string): void {

    if (componentId && this._currentComponentId && this._currentComponentId !== componentId) {
      this.reset();
    }

    if (componentId) {
      this._currentComponentId = componentId;
    }

    if (this._initialized()) {
      return;
    }

    this.loadFromUrl();

    if (!this._currentSort().field && defaultSort?.field) {
      this._currentSort.set(defaultSort);
    }

    this._initialized.set(true);
  }


  shouldLoad(): boolean {
    const currentFingerprint = this.stateFingerprint();

    if (currentFingerprint === this._lastLoadedFingerprint) {
      return false;
    }

    this._lastLoadedFingerprint = currentFingerprint;
    return true;
  }

  resetLoadTracker(): void {
    this._lastLoadedFingerprint = '';
  }

  private loadFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    this._search.set(params['search'] || '');

    // Nettoyer les filtres dès le chargement
    const filters: FilterValue = {};
    Object.keys(params).forEach(key => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          filters[filterKey] = value;
        }
      }
    });
    this._filterValues.set(filters);

    if (params['sortField']) {
      this._currentSort.set({
        field: params['sortField'],
        direction: params['sortDir'] || 'asc'
      });
    }

    this._currentPage.set(params['page'] ? +params['page'] : 1);
  }

  private syncToUrl(): void {
    const queryParams: any = {};

    const search = this._search();
    const filters = this._filterValues();
    const sort = this._currentSort();
    const page = this._currentPage();

    if (search) {
      queryParams['search'] = search;
    }

    // Ne synchroniser QUE les valeurs non-vides
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams[`filter_${key}`] = value;
      }
    });

    if (sort.field) {
      queryParams['sortField'] = sort.field;
      queryParams['sortDir'] = sort.direction;
    }

    if (page > 1) {
      queryParams['page'] = page;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  setSearch(search: string): void {
    this._search.set(search);
    this._currentPage.set(1);
    this.syncToUrl();
  }

  setFilter(key: string, value: any): void {
    this._filterValues.update(current => {
      const updated = { ...current };

      // Si vide, supprimer la clé
      if (value === null || value === undefined || value === '') {
        delete updated[key];
      } else {
        updated[key] = value;
      }

      return updated;
    });
    this._currentPage.set(1);
    this.syncToUrl();
  }

  setFilters(filters: FilterValue): void {
    //Nettoyer les valeurs vides
    const cleanedFilters: FilterValue = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        cleanedFilters[key] = value;
      }
    });

    this._filterValues.set(cleanedFilters);
    this._currentPage.set(1);
    this.syncToUrl();
  }

  hasUrlParams(): boolean {
    const params = this.route.snapshot.queryParams;
    return Object.keys(params).length > 0;
  }

  setSort(sort: SortConfig): void {
    this._currentSort.set(sort);
    this.syncToUrl();
  }

  setPage(page: number): void {
    this._currentPage.set(page);
    this.syncToUrl();
  }

  reset(defaultSort?: SortConfig): void {
    this._search.set('');
    this._filterValues.set({});

    if (defaultSort) {
      this._currentSort.set(defaultSort);
    } else {
      this._currentSort.set({ field: '', direction: 'asc' });
    }

    this._currentPage.set(1);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }
}
