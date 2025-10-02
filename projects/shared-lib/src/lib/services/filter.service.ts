import { Injectable, signal, computed } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {FilterValue, SortConfig} from '../modules/filter-bar/filter.model';
@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filtersSignal = signal<FilterValue>({});
  private sortSignal = signal<SortConfig | null>(null);
  private searchSubject = new Subject<string>();

  filters = this.filtersSignal.asReadonly();
  sort = this.sortSignal.asReadonly();

  search$ = this.searchSubject.pipe(
    debounceTime(400),
    distinctUntilChanged()
  );

  hasActiveFilters = computed(() => {
    const filters = this.filtersSignal();
    return Object.keys(filters).some(key =>
      filters[key] !== null &&
      filters[key] !== undefined &&
      filters[key] !== ''
    );
  });

  setFilter(key: string, value: any): void {
    this.filtersSignal.update(filters => ({
      ...filters,
      [key]: value
    }));
  }

  setFilters(filters: FilterValue): void {
    this.filtersSignal.set(filters);
  }

  clearFilter(key: string): void {
    this.filtersSignal.update(filters => {
      const updated = { ...filters };
      delete updated[key];
      return updated;
    });
  }

  clearAllFilters(): void {
    this.filtersSignal.set({});
    this.sortSignal.set(null);
  }

  setSort(field: string, direction: 'asc' | 'desc'): void {
    this.sortSignal.set({ field, direction });
  }

  toggleSort(field: string): void {
    const currentSort = this.sortSignal();
    if (currentSort?.field === field) {
      this.sortSignal.set({
        field,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.sortSignal.set({ field, direction: 'asc' });
    }
  }

  emitSearch(term: string): void {
    this.searchSubject.next(term);
  }
}
