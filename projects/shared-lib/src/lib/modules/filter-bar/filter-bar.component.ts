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
  untracked,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {FilterConfig, FilterValue, SortConfig, SortOption} from './filter.model';
import {Choice, ChoiceOption} from '../choice-lib';
import {UrlStateService} from '../../services';

@Component({
  selector: 'lib-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, Choice],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css'],
})
export class FilterBarComponent implements OnInit {
  private translate = inject(TranslateService);
  private urlState = inject(UrlStateService);

  // Inputs
  filters = input<FilterConfig[]>([]);
  sortOptions = input<SortOption[]>([]);
  selectedCount = input<number>(0);
  showSearch = input<boolean>(true);
  noSelectionText = input<string>('filterBarShared.noSelection');
  selectionText = input<string>('filterBarShared.selected');
  enableUrlSync = input<boolean>(true);

  // Outputs
  searchChange = output<string>();
  filterChange = output<FilterValue>();
  sortChange = output<SortConfig>();
  clearFilters = output<void>();

  // State
  searchTerm = signal<string>('');
  filterValues = signal<FilterValue>({});
  currentSort = signal<SortConfig>({ field: '', direction: 'asc' });


  protected choiceRefreshKey = signal(0);
  private filtersFingerprint = signal<string>('');

  sortChoice = viewChild<Choice>('sortChoice');
  sortChoiceMobile = viewChild<Choice>('sortChoiceMobile');
  filterChoices = viewChildren<Choice>(Choice);

  private initialized = signal(false);
  private isResetting = signal(false);
  private isSyncing = signal(false);

  constructor() {
    // Initialiser depuis URL au premier chargement
    effect(() => {
      if (!this.initialized() && this.enableUrlSync()) {
        const urlState = this.urlState.getStateFromUrl();

        if (urlState.search) this.searchTerm.set(urlState.search);
        if (urlState.filters) this.filterValues.set(urlState.filters);
        if (urlState.sort) this.currentSort.set(urlState.sort);

        this.initialized.set(true);
      }
    });

    // Sync vers URL quand état change
    effect(() => {
      if (!this.initialized() || !this.enableUrlSync()) return;

      const search = this.searchTerm();
      const filters = this.filterValues();
      const sort = this.currentSort();

      untracked(() => {
        if (!this.isResetting() && !this.isSyncing()) {
          this.urlState.syncToUrl({ search, filters, sort });
        }
      });
    });

    // Initialiser sort par défaut
    effect(() => {
      const options = this.sortOptions();
      if (options.length > 0 && this.currentSort().field === '' && this.initialized()) {
        this.currentSort.set({ field: options[0].value, direction: 'asc' });
      }
    });

    // Sync Choice avec sort
    effect(() => {
      const options = this.sortOptions();
      if (options.length > 0 && this.currentSort().field && this.initialized()) {
        setTimeout(() => {
          const field = this.currentSort().field;
          this.sortChoice()?.setChoiceByValue(field);
          this.sortChoiceMobile()?.setChoiceByValue(field);
        }, 150);
      }
    });

    // Sync Choice des filtres avec filterValues
    effect(() => {
      const filterValues = this.filterValues();
      const filterChoices = this.filterChoices();

      if (this.initialized() && !this.isResetting() && filterChoices.length > 0) {
        setTimeout(() => {
          this.isSyncing.set(true);

          this.filters().forEach((filter) => {
            if ((filter.type === 'select' || filter.type === 'boolean') && filterValues[filter.key]) {
              const filterChoiceIndex = this.findFilterChoiceIndex(filter.key);
              if (filterChoiceIndex >= 0 && filterChoiceIndex < filterChoices.length) {
                filterChoices[filterChoiceIndex]?.setChoiceByValue(filterValues[filter.key]);
              }
            }
          });

          setTimeout(() => {
            this.isSyncing.set(false);
          }, 50);
        }, 200);
      }
    });

    // Détecter les changements RÉELS de filtres
    effect(() => {
      const filters = this.filters();

      const fingerprint = JSON.stringify(
        filters.map(f => ({
          key: f.key,
          label: f.label,
          placeholder: f.placeholder,
          optionsCount: f.options?.length || 0,
          optionsLabels: f.options?.map(o => o.label).join(',') || ''
        }))
      );

      untracked(() => {
        const previousFingerprint = this.filtersFingerprint();

        if (this.initialized() &&
          filters.length > 0 &&
          !this.isResetting() &&
          fingerprint !== previousFingerprint) {

          this.choiceRefreshKey.set(-1);

          setTimeout(() => {
            this.choiceRefreshKey.set(Date.now());
            this.filtersFingerprint.set(fingerprint);
          }, 50);
        } else if (!this.initialized() && filters.length > 0) {
          this.filtersFingerprint.set(fingerprint);
        }
      });
    });
  }

  ngOnInit(): void {
  }

  private findFilterChoiceIndex(filterKey: string): number {
    let index = 0;
    for (const filter of this.filters()) {
      if (filter.type === 'select' || filter.type === 'boolean') {
        if (filter.key === filterKey) {
          return index;
        }
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

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchChange.emit(value);
  }

  onFilterChange(key: string, value: any): void {
    if (this.isSyncing()) return;

    this.filterValues.update(current => ({
      ...current,
      [key]: value
    }));
    this.filterChange.emit(this.filterValues());
  }

  onSortFieldChangeFromChoice(field: any): void {
    if (field && field !== this.currentSort().field) {
      this.currentSort.update(s => ({ ...s, field }));
      this.sortChange.emit(this.currentSort());
    }
  }

  toggleSortDirection(): void {
    this.currentSort.update(s => ({
      ...s,
      direction: s.direction === 'asc' ? 'desc' : 'asc'
    }));
    this.sortChange.emit(this.currentSort());
  }

  hasActiveFilters(): boolean {
    const values = this.filterValues();
    const hasFilters = Object.keys(values).some(key =>
      values[key] !== null && values[key] !== undefined && values[key] !== ''
    );
    const hasSearch = this.searchTerm() !== '';
    const hasSortChanged = this.sortOptions().length > 0 &&
      (this.currentSort().field !== this.sortOptions()[0].value ||
        this.currentSort().direction !== 'asc');
    return hasFilters || hasSearch || hasSortChanged;
  }

  onClearFilters(): void {
    this.isResetting.set(true);

    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' as const }
      : this.currentSort();

    this.searchTerm.set('');
    this.filterValues.set({});
    this.currentSort.set(defaultSort);

    this.searchChange.emit('');
    this.filterChange.emit({});
    this.sortChange.emit(defaultSort);
    this.clearFilters.emit();

    this.choiceRefreshKey.set(-1);

    setTimeout(() => {
      this.choiceRefreshKey.set(Date.now());

      setTimeout(() => {
        if (this.sortOptions().length > 0) {
          const sortValue = this.sortOptions()[0].value;
          this.sortChoice()?.setChoiceByValue(sortValue);
          this.sortChoiceMobile()?.setChoiceByValue(sortValue);
        }

        if (this.enableUrlSync()) {
          this.urlState.clearUrl();
        }

        setTimeout(() => {
          this.isResetting.set(false);
        }, 50);
      }, 100);
    }, 0);
  }

  getFilterValue(key: string): any {
    return this.filterValues()[key] || '';
  }

  getSortChoiceOptions(): ChoiceOption[] {
    return this.sortOptions().map(option => ({
      value: option.value,
      label: option.label
    }));
  }

  getSortChoiceConfig(): any {
    return {
      searchEnabled: false,
      shouldSort: false,
      removeItemButton: false,
      classNames: {
        containerInner: ['form-select']
      }
    };
  }

  getChoiceConfig(filter: FilterConfig): any {
    const baseConfig = {
      searchEnabled: filter.options && filter.options.length > 5,
      shouldSort: false,
      removeItemButton: false,
      classNames: {
        containerInner: ['form-select'],
      }
    };

    if (filter.avatarField && filter.options?.some(o => o.avatarSrc)) {
      return {
        ...baseConfig,
        callbackOnCreateTemplates: (template: any) => ({
          item: (classNames: any, data: any) => {
            const avatarSrc = data.customProperties?.avatarSrc;
            if (avatarSrc) {
              return template(`
                <div class="${classNames.item} ${data.highlighted ? classNames.highlightedState : ''} ${data.placeholder ? classNames.placeholder : ''}" data-item data-id="${data.id}" data-value="${data.value}">
                  <div class="avatar avatar-xs me-3">
                    <img class="avatar-img" src="${avatarSrc}" alt="${data.label}">
                  </div>
                  ${data.label}
                </div>
              `);
            }
            return template(`<div class="${classNames.item}">${data.label}</div>`);
          },
          choice: (classNames: any, data: any) => {
            const avatarSrc = data.customProperties?.avatarSrc;
            if (avatarSrc) {
              return template(`
                <div class="${classNames.item} ${classNames.itemChoice} dropdown-item" data-select-text="Press to select" data-choice ${data.disabled ? 'data-choice-disabled aria-disabled="true"' : 'data-choice-selectable'} data-id="${data.id}" data-value="${data.value}" role="option">
                  <div class="avatar avatar-xs me-3">
                    <img class="avatar-img" src="${avatarSrc}" alt="${data.label}">
                  </div>
                  ${data.label}
                </div>
              `);
            }
            return template(`<div class="${classNames.item} ${classNames.itemChoice} dropdown-item">${data.label}</div>`);
          }
        })
      };
    }

    return { ...baseConfig, ...filter.choiceConfig };
  }
}
