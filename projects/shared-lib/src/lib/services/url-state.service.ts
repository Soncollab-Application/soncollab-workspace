import { Injectable, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { FilterValue, SortConfig } from '../modules/filter-bar/filter.model';

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

  syncToUrl(state: UrlStateConfig, replaceUrl = false): void {
    if (this.isUpdatingFromUrl()) return;

    const queryParams: Params = {};

    if (state.search) queryParams['search'] = state.search;

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

    if (state.page && state.page > 1) queryParams['page'] = state.page;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl
    });
  }

  getStateFromUrl(route?: ActivatedRoute): UrlStateConfig {
    const targetRoute = route || this.route;
    this.isUpdatingFromUrl.set(true);

    const params = targetRoute.snapshot.queryParams;
    const state: UrlStateConfig = {};

    if (params['search']) state.search = params['search'];

    const filters: FilterValue = {};
    Object.keys(params).forEach(key => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        filters[filterKey] = params[key];
      }
    });
    if (Object.keys(filters).length > 0) state.filters = filters;

    if (params['sortField']) {
      state.sort = {
        field: params['sortField'],
        direction: params['sortDir'] || 'asc'
      };
    }

    if (params['page']) state.page = +params['page'];

    setTimeout(() => this.isUpdatingFromUrl.set(false), 0);
    return state;
  }

  clearUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
  }
}
