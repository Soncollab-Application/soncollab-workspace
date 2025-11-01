import { Injectable, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, Params } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FilterValue, SortConfig } from '../modules';

export interface UrlStateConfig {
  search?: string;
  filters?: FilterValue;
  sort?: SortConfig;
  page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UrlStateService {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private isUpdatingFromUrl = signal(false);

  // Observable des changements d'URL
  readonly urlChange$: Observable<void> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(() => void 0)
  );

  // Synchroniser vers l'URL
  syncToUrl(state: UrlStateConfig, replaceUrl = true): void {
    if (this.isUpdatingFromUrl()) return;

    const queryParams: Params = {};

    if (state.search) {
      queryParams['search'] = state.search;
    }

    if (state.filters) {
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams[`filter_${key}`] = value;
        }
      });
    }

    if (state.sort) {
      queryParams['sortField'] = state.sort.field;
      queryParams['sortDir'] = state.sort.direction;
    }

    if (state.page && state.page > 1) {
      queryParams['page'] = state.page;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl
    });
  }

  // Récupérer l'état depuis l'URL
  getStateFromUrl(route?: ActivatedRoute): UrlStateConfig {
    const targetRoute = route || this.route;
    this.isUpdatingFromUrl.set(true);

    const params = targetRoute.snapshot.queryParams;
    const state: UrlStateConfig = {};

    if (params['search']) {
      state.search = params['search'];
    }

    const filters: FilterValue = {};
    Object.keys(params).forEach(key => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        filters[filterKey] = params[key];
      }
    });
    if (Object.keys(filters).length > 0) {
      state.filters = filters;
    }

    if (params['sortField']) {
      state.sort = {
        field: params['sortField'],
        direction: params['sortDir'] || 'asc'
      };
    }

    if (params['page']) {
      state.page = +params['page'];
    }

    setTimeout(() => this.isUpdatingFromUrl.set(false), 0);
    return state;
  }

  // Récupérer les query params actuels
  getQueryParams(): any {
    return this.route.snapshot.queryParams;
  }

  // Effacer l'URL
  clearUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
  }
}
