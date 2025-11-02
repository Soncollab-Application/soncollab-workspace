import {
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
  viewChildren,
  effect,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FilterConfig, FilterValue, SortConfig, SortOption } from './filter.model';
import { Choice, ChoiceOption, ChoiceConfig } from '../choice-lib';
import { FilterStateService } from '../../services';

@Component({
  selector: 'lib-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, Choice],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css'],
})
export class FilterBarComponent implements OnInit {
  private translate = inject(TranslateService);
  private filterState = inject(FilterStateService);

  filters = input<FilterConfig[]>([]);
  sortOptions = input<SortOption[]>([]);
  selectedCount = input<number>(0);
  showSearch = input<boolean>(true);
  noSelectionText = input<string>('filterBarShared.noSelection');
  selectionText = input<string>('filterBarShared.selected');
  useFilterState = input<boolean>(true);
  sortPlaceholder = input<string>('filterBarShared.sortBy');
  showViewSelector = input<boolean>(false); // Nouveau Input pour activer/désactiver le sélecteur
  currentView = input<'table' | 'card'>('table'); // Nouveau Input pour la vue actuelle

  viewChange = output<'table' | 'card'>(); // Nouvel Output pour le changement de vue

  searchChange = output<string>();
  filterChange = output<FilterValue>();
  sortChange = output<SortConfig>();
  clearFilters = output<void>();

  sortChoice = viewChild<Choice>('sortChoice');
  sortChoiceMobile = viewChild<Choice>('sortChoiceMobile');
  filterChoices = viewChildren<Choice>(Choice);

  protected searchTerm = computed(() =>
    this.useFilterState() ? this.filterState.state().search : ''
  );

  protected filterValues = computed(() =>
    this.useFilterState() ? this.filterState.state().filters : {}
  );

  protected currentSort = computed(() =>
    this.useFilterState() ? this.filterState.state().sort : { field: '', direction: 'asc' as const }
  );

  protected choiceRefreshKey = signal(0);
  private filtersFingerprint = signal<string>('');
  private isResetting = signal(false);
  private isSyncing = signal(false);

  constructor() {
    effect(() => {
      if (!this.useFilterState()) return;

      const sort = this.currentSort();
      const sortOptions = this.sortOptions();

      if (sortOptions.length > 0 && sort.field && this.filterState.initialized()) {
        this.isSyncing.set(true);
        setTimeout(() => {
          this.sortChoice()?.setChoiceByValue(sort.field);
          this.sortChoiceMobile()?.setChoiceByValue(sort.field);
          setTimeout(() => this.isSyncing.set(false), 50);
        }, 100);
      }
    });

    // Synchroniser DESKTOP ET MOBILE
    effect(() => {
      if (!this.useFilterState()) return;

      const filterValues = this.filterValues();
      const filterChoices = this.filterChoices();
      const filters = this.filters();

      if (this.filterState.initialized() && !this.isResetting() && filterChoices.length > 0) {
        this.isSyncing.set(true);
        setTimeout(() => {
          const selectFilters = filters.filter(f => f.type === 'select' || f.type === 'boolean');
          const hasSort = this.sortOptions().length > 0;

          const desktopFilterCount = selectFilters.length;
          const sortOffset = hasSort ? 1 : 0;
          const mobileFilterStartIndex = desktopFilterCount + sortOffset;

          selectFilters.forEach((filter, index) => {
            const value = filterValues[filter.key];
            if (value && filter.options && filter.options.length > 0) {
              // Desktop
              if (index < filterChoices.length) {
                filterChoices[index]?.setChoiceByValue(value);
              }

              // Mobile
              const mobileIndex = mobileFilterStartIndex + index;
              if (mobileIndex < filterChoices.length) {
                filterChoices[mobileIndex]?.setChoiceByValue(value);
              }
            }
          });

          setTimeout(() => this.isSyncing.set(false), 50);
        }, 150);
      }
    });

    effect(() => {
      const filters = this.filters();
      const fingerprint = JSON.stringify(
        filters.map(f => ({
          key: f.key,
          label: f.label,
          optionsCount: f.options?.length || 0,
        }))
      );

      if (fingerprint !== this.filtersFingerprint() && filters.length > 0) {
        this.choiceRefreshKey.update(v => v + 1);
        this.filtersFingerprint.set(fingerprint);
      }
    });
  }

  ngOnInit(): void {
    if (this.useFilterState()) {
      this.filterState.initialize();
    }
  }

  private findFilterChoiceIndex(filterKey: string): number {
    let index = 0;
    for (const filter of this.filters()) {
      if (filter.type === 'select' || filter.type === 'boolean') {
        if (filter.key === filterKey) return index;
        index++;
      }
    }
    return -1;
  }

  getChoiceKey(filterKey: string): string {
    return `${filterKey}-${this.choiceRefreshKey()}`;
  }

  selectedText(): string {
    const count = this.selectedCount();
    if (count < 0) return '';
    if (count > 0) return this.translate.instant(this.selectionText(), { count });
    return this.translate.instant(this.noSelectionText());
  }

  getFilterValue(key: string): any {
    return this.filterValues()[key] || '';
  }

  getChoiceConfig(filter: FilterConfig): ChoiceConfig {
    return {
      searchEnabled: filter.options && filter.options.length > 5,
      shouldSort: false,
      itemSelectText: ''
    };
  }

  getSortChoiceOptions(): ChoiceOption[] {
    return this.sortOptions().map(opt => ({
      value: opt.value,
      label: opt.label,
      selected: opt.value === this.currentSort().field
    }));
  }

  getSortChoiceConfig(): ChoiceConfig {
    return {
      searchEnabled: false,
      shouldSort: false,
      itemSelectText: '',
      placeholderValue: this.translate.instant(this.sortPlaceholder())
    };
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (this.useFilterState()) {
      this.filterState.setSearch(value);
    }

    this.searchChange.emit(value);
  }

  onFilterChange(key: string, value: any): void {
    if (this.isSyncing() || this.isResetting()) {
      return;
    }

    if (value === '' || value === null || value === undefined) {
      return;
    }

    if (this.useFilterState()) {
      this.filterState.setFilter(key, value);
    }

    const updatedFilters = { ...this.filterValues(), [key]: value };
    this.filterChange.emit(updatedFilters);
  }

  onFilterRemove(key: string): void {
    if (this.isSyncing() || this.isResetting()) {
      return;
    }

    if (this.useFilterState()) {
      this.filterState.setFilter(key, '');
    }

    const updatedFilters = { ...this.filterValues() };
    delete updatedFilters[key];
    this.filterChange.emit(updatedFilters);
  }

  onSortRemove(): void {
    if (this.isSyncing() || this.isResetting()) {
      return;
    }

    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' as const }
      : { field: '', direction: 'asc' as const };

    if (this.useFilterState()) {
      this.filterState.setSort(defaultSort);
    }

    this.sortChange.emit(defaultSort);
  }


  onViewChange(view: 'table' | 'card'): void {
    if (this.isSyncing() || this.isResetting()) {
      return;
    }
    if (view !== this.currentView()) {
      if (this.useFilterState()) {
        this.filterState.setView(view);
      }
      this.viewChange.emit(view);
    }
  }

  onSortFieldChangeFromChoice(field: any): void {
    if (this.isSyncing()) {
      return;
    }

    const currentSort = this.currentSort();
    if (field && field !== currentSort.field) {
      const newSort = { ...currentSort, field };

      if (this.useFilterState()) {
        this.filterState.setSort(newSort);
      }

      this.sortChange.emit(newSort);
    }
  }

  toggleSortDirection(): void {
    const currentSort = this.currentSort();
    const newSort = {
      ...currentSort,
      direction: currentSort.direction === 'asc' ? 'desc' as const : 'asc' as const
    };

    if (this.useFilterState()) {
      this.filterState.setSort(newSort);
    }

    this.sortChange.emit(newSort);
  }

  hasActiveFilters(): boolean {
    const values = this.filterValues();
    const hasFilters = Object.keys(values).some(key =>
      values[key] !== null && values[key] !== undefined && values[key] !== ''
    );
    const hasSearch = this.searchTerm() !== '';

    if (!this.useFilterState()) {
      const currentSort = this.currentSort();
      const hasSortChanged = this.sortOptions().length > 0 &&
        (currentSort.field !== this.sortOptions()[0].value ||
          currentSort.direction !== 'asc');
      return hasFilters || hasSearch || hasSortChanged;
    }

    return this.filterState.hasUrlParams();
  }

  onClearFilters(): void {
    this.isResetting.set(true);

    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' as const }
      : undefined;

    if (this.useFilterState()) {
      this.filterState.reset(defaultSort);
    }

    this.clearFilters.emit();
    this.choiceRefreshKey.set(-1);

    setTimeout(() => {
      this.choiceRefreshKey.set(0);

      setTimeout(() => {
        if (defaultSort) {
          this.sortChoice()?.setChoiceByValue(defaultSort.field);
          this.sortChoiceMobile()?.setChoiceByValue(defaultSort.field);
        }

        this.isResetting.set(false);
      }, 150);
    }, 50);
  }
}
