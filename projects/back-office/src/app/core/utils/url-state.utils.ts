import { ActivatedRoute } from '@angular/router';
import { WritableSignal } from '@angular/core';
import { FilterValue, SortConfig, UrlStateService } from 'shared-lib';

export function initializeFromUrl(
  route: ActivatedRoute,
  urlState: UrlStateService,
  searchTerm: WritableSignal<string>,
  filterValues: WritableSignal<FilterValue>,
  currentSort: WritableSignal<SortConfig>,
  currentPage: WritableSignal<number>
): void {
  const state = urlState.getStateFromUrl(route);

  if (state.search) {
    searchTerm.set(state.search);
  }

  if (state.filters) {
    filterValues.set(state.filters);
  }

  if (state.sort) {
    currentSort.set(state.sort);
  }

  if (state.page) {
    currentPage.set(state.page);
  }
}
