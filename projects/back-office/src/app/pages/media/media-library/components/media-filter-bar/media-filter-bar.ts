import {Component, inject, input, output} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

export interface MediaFilterField {
  field: string;
  operator: string;
  value: string;
}

@Component({
  selector: 'app-media-filter-bar',
  imports: [
    TranslatePipe
  ],
  templateUrl: './media-filter-bar.html',
  styleUrl: './media-filter-bar.css',
})
export class MediaFilterBar {
  private translate = inject(TranslateService);

  // Inputs
  currentSort = input.required<string>();
  searchQuery = input.required<string>();
  viewMode = input.required<'grid' | 'list'>();
  allSelected = input.required<boolean>();
  hasSelection = input.required<boolean>();
  appliedFilters = input.required<MediaFilterField[]>();
  selectedField = input.required<string | null>();
  selectedOperator = input.required<string | null>();
  selectedValue = input.required<string | null>();

  // Outputs
  sortChange = output<string>();
  searchChange = output<string>();
  clearSearchClick = output<void>();
  viewModeChange = output<'grid' | 'list'>();
  selectAllChange = output<void>();
  addFilterClick = output<void>();
  removeFilterClick = output<number>();
  clearFiltersClick = output<void>();
  fieldChange = output<string>();
  operatorChange = output<string>();
  valueChange = output<string>();


  private searchTimeout: any;

  onSearchInput(value: string): void {
    clearTimeout(this.searchTimeout);
  }

  onFieldChange(field: string): void {
    this.fieldChange.emit(field);
  }

  onOperatorChange(operator: string): void {
    this.operatorChange.emit(operator);
  }

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }

  canAddFilter(): boolean {
    return !!(
      this.selectedField() &&
      this.selectedOperator() &&
      this.selectedValue()
    );
  }

  getFilterLabel(filter: MediaFilterField): string {
    const fieldLabel = this.translate.instant(`mediaLibrary.filters.${filter.field}`);

    let operatorLabel = '';
    switch (filter.operator) {
      case '$eq':
        operatorLabel = this.translate.instant('mediaLibrary.filters.is');
        break;
      case '$ne':
        operatorLabel = this.translate.instant('mediaLibrary.filters.isNot');
        break;
      case '$gt':
        operatorLabel = '>';
        break;
      case '$gte':
        operatorLabel = '≥';
        break;
      case '$lt':
        operatorLabel = '<';
        break;
      case '$lte':
        operatorLabel = '≤';
        break;
      case '$contains':
        operatorLabel = this.translate.instant('mediaLibrary.filters.is');
        break;
      case '$notContains':
        operatorLabel = this.translate.instant('mediaLibrary.filters.isNot');
        break;
    }

    let valueLabel = filter.value;
    if (filter.field === 'mime') {
      valueLabel = this.translate.instant(`mediaLibrary.filters.${filter.value}`);
    }

    return `${fieldLabel} ${operatorLabel} ${valueLabel}`;
  }
}
