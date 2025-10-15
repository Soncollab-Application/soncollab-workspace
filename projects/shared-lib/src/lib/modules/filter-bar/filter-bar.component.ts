import {
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
  effect,
  untracked,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';
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
  noSelectionText = input<string>('filterBar.noSelection');
  selectionText = input<string>('filterBar.selected');
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

  sortChoice = viewChild<Choice>('sortChoice');
  sortChoiceMobile = viewChild<Choice>('sortChoiceMobile');

  private initialized = signal(false);
  private isResetting = signal(false); // NOUVEAU : Flag pour éviter les conflits

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

      // Ne pas sync pendant le reset
      untracked(() => {
        if (!this.isResetting()) {
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

    // Détecter changements de filtres SAUF pendant reset
    effect(() => {
      const filters = this.filters();

      untracked(() => {
        if (this.initialized() && filters.length > 0 && !this.isResetting()) {
          this.choiceRefreshKey.update(v => v + 1);
        }
      });
    });
  }

  ngOnInit(): void {
    this.translate.setTranslation('en', { filterBar: enTranslations.filterBar }, true);
    this.translate.setTranslation('fr', { filterBar: frTranslations.filterBar }, true);
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

    // 1. Sauvegarder les valeurs par défaut
    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' as const }
      : this.currentSort();

    // 2. Réinitialiser les valeurs
    this.searchTerm.set('');
    this.filterValues.set({});
    this.currentSort.set(defaultSort);

    // 3. Émettre les événements
    this.searchChange.emit('');
    this.filterChange.emit({});
    this.sortChange.emit(defaultSort);
    this.clearFilters.emit();

    // 4. Détruire les Choice
    this.choiceRefreshKey.set(-1);

    setTimeout(() => {
      // 5. Recréer les Choice
      this.choiceRefreshKey.set(0);

      setTimeout(() => {
        // 6. Réinitialiser le sort
        if (this.sortOptions().length > 0) {
          const sortValue = this.sortOptions()[0].value;
          this.sortChoice()?.setChoiceByValue(sortValue);
          this.sortChoiceMobile()?.setChoiceByValue(sortValue);
        }

        // 7. Sync URL après tout
        if (this.enableUrlSync()) {
          this.urlState.clearUrl();
        }

        // 8. NOUVEAU : Désactiver le flag de reset
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
