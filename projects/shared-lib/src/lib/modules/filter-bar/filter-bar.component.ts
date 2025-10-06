import {Component, inject, input, OnInit, output, signal, viewChild, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';
import {FilterConfig, FilterValue, SortConfig, SortOption} from './filter.model';
import {Choice, ChoiceOption} from '../choice-lib';

@Component({
  selector: 'lib-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, Choice],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.css']
})
export class FilterBarComponent implements OnInit {
  private translate = inject(TranslateService);

  // Inputs
  filters = input<FilterConfig[]>([]);
  sortOptions = input<SortOption[]>([]);
  selectedCount = input<number>(0);
  showSearch = input<boolean>(true);
  noSelectionText = input<string>('filterBar.noSelection');
  selectionText = input<string>('filterBar.selected');

  // Outputs
  searchChange = output<string>();
  filterChange = output<FilterValue>();
  sortChange = output<SortConfig>();
  clearFilters = output<void>();

  // State
  searchTerm = signal<string>('');
  filterValues = signal<FilterValue>({});
  currentSort = signal<SortConfig>({ field: '', direction: 'asc' });

  // ViewChilds pour les Choice de tri
  sortChoice = viewChild<Choice>('sortChoice');
  sortChoiceMobile = viewChild<Choice>('sortChoiceMobile');

  // Signal pour forcer le re-render des options
  private sortOptionsVersion = signal(0);

  constructor() {
    // Effect pour détecter les changements d'options de tri
    effect(() => {
      const options = this.sortOptions();
      if (options.length > 0 && this.currentSort().field === '') {
        this.currentSort.set({ field: options[0].value, direction: 'asc' });
      }
    });
  }

  ngOnInit(): void {
    this.translate.setTranslation('en', { filterBar: enTranslations.filterBar }, true);
    this.translate.setTranslation('fr', { filterBar: frTranslations.filterBar }, true);
  }

  selectedText(): string {
    const count = this.selectedCount();
    if (count > 0) {
      return this.translate.instant(this.selectionText(), { count });
    }
    return this.translate.instant(this.noSelectionText());
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchChange.emit(value);
  }

  onFilterChange(key: string, value: any): void {
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
      values[key] !== null &&
      values[key] !== undefined &&
      values[key] !== ''
    );
    const hasSearch = this.searchTerm() !== '';
    const hasSortChanged = this.sortOptions().length > 0 &&
      (this.currentSort().field !== this.sortOptions()[0].value ||
        this.currentSort().direction !== 'asc');

    return hasFilters || hasSearch || hasSortChanged;
  }

  onClearFilters(): void {
    this.searchTerm.set('');
    this.filterValues.set({});

    if (this.sortOptions().length > 0) {
      const defaultSort = { field: this.sortOptions()[0].value, direction: 'asc' as const };
      this.currentSort.set(defaultSort);
      this.sortChange.emit(defaultSort);
    }

    this.searchChange.emit('');
    this.filterChange.emit({});
    this.clearFilters.emit();
  }

  getFilterValue(key: string): any {
    return this.filterValues()[key] || '';
  }

  getSortChoiceOptions(): ChoiceOption[] {
    // Forcer la création d'un nouveau tableau à chaque appel
    return this.sortOptions().map(option => ({
      value: option.value,
      label: option.label,
      selected: option.value === this.currentSort().field
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
        containerInner: ['form-select']
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
