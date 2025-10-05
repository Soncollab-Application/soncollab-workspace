import {Component, inject, input, OnInit, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';
import {FilterConfig, FilterValue} from './filter.model';
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
  searchPlaceholder = input<string>('');
  showSearch = input<boolean>(true);
  showClearButton = input<boolean>(true);

  // Outputs
  searchChange = output<string>();
  filterChange = output<FilterValue>();
  clearFilters = output<void>();

  // State
  searchTerm = signal<string>('');
  filterValues = signal<FilterValue>({});

  ngOnInit(): void {
    this.translate.setTranslation('en', { filterBar: enTranslations.filterBar }, true);
    this.translate.setTranslation('fr', { filterBar: frTranslations.filterBar }, true);
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

  onClearFilters(): void {
    this.searchTerm.set('');
    this.filterValues.set({});
    this.clearFilters.emit();
  }

  hasActiveFilters(): boolean {
    const values = this.filterValues();
    return Object.keys(values).some(key =>
      values[key] !== null &&
      values[key] !== undefined &&
      values[key] !== ''
    ) || this.searchTerm() !== '';
  }

  getFilterValue(key: string): any {
    return this.filterValues()[key] || '';
  }

  getSearchPlaceholder(): string {
    return this.searchPlaceholder() || this.translate.instant('filterBar.search');
  }

  getChoiceConfig(filter: FilterConfig): any {
    return {
      searchEnabled: filter.options && filter.options.length > 5,
      shouldSort: false,
      removeItemButton: false,
      classNames: {
        containerInner: ['form-select', 'bg-transparent']
      },
      ...filter.choiceConfig
    };
  }

  getBooleanOptions(): ChoiceOption[] {
    return [
      { value: '', label: this.translate.instant('filterBar.select'), placeholder: true },
      { value: 'true', label: this.translate.instant('filterBar.yes') },
      { value: 'false', label: this.translate.instant('filterBar.no') }
    ];
  }
}
