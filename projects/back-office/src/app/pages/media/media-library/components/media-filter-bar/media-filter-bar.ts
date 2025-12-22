import {Component, computed, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {Choice, ChoiceOption, ChoiceConfig, Datepicker} from 'shared-lib';
import {inject} from '@angular/core';

export interface MediaFilterField {
  field: string;
  operator: string;
  value: string;
}

@Component({
  selector: 'app-media-filter-bar',
  standalone: true,
  imports: [CommonModule, TranslateModule, Choice, Datepicker],
  templateUrl: './media-filter-bar.html',
  styleUrl: './media-filter-bar.css'
})
export class MediaFilterBar {
  private translate = inject(TranslateService);

  // Required Inputs
  currentSort = input.required<string>();
  searchQuery = input.required<string>();
  viewMode = input.required<'grid' | 'list'>();
  allSelected = input.required<boolean>();
  hasSelection = input.required<boolean>();
  appliedFilters = input.required<MediaFilterField[]>();
  selectedField = input.required<string | null>();
  selectedOperator = input.required<string | null>();
  selectedValue = input.required<string | null>();

  // Optional Inputs - Control Visibility
  showCheckbox = input<boolean>(true);
  showSort = input<boolean>(true);
  showFilterButton = input<boolean>(true);
  showAppliedFilters = input<boolean>(true);
  showViewButtons = input<boolean>(true);
  showSearch = input<boolean>(true);

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

  // Sort options avec selected basé sur currentSort
  sortOptions = computed<ChoiceOption[]>(() => {
    const current = this.currentSort();
    return [
      { value: 'createdAt:DESC', label: this.translate.instant('mediaLibrary.sort.newest'), selected: current === 'createdAt:DESC' },
      { value: 'createdAt:ASC', label: this.translate.instant('mediaLibrary.sort.oldest'), selected: current === 'createdAt:ASC' },
      { value: 'name:ASC', label: this.translate.instant('mediaLibrary.sort.nameAsc'), selected: current === 'name:ASC' },
      { value: 'name:DESC', label: this.translate.instant('mediaLibrary.sort.nameDesc'), selected: current === 'name:DESC' },
      { value: 'updatedAt:DESC', label: this.translate.instant('mediaLibrary.sort.recentlyUpdated'), selected: current === 'updatedAt:DESC' },
      { value: 'updatedAt:ASC', label: this.translate.instant('mediaLibrary.sort.oldestUpdated'), selected: current === 'updatedAt:ASC' }
    ];
  });

  // Field options avec selected basé sur selectedField
  fieldOptions = computed<ChoiceOption[]>(() => {
    const current = this.selectedField();
    return [
      { value: 'createdAt', label: this.translate.instant('mediaLibrary.filters.createdAt'), selected: current === 'createdAt' },
      { value: 'updatedAt', label: this.translate.instant('mediaLibrary.filters.updatedAt'), selected: current === 'updatedAt' },
      { value: 'mime', label: this.translate.instant('mediaLibrary.filters.type'), selected: current === 'mime' }
    ];
  });

  // Operator options for dates avec selected
  dateOperatorOptions = computed<ChoiceOption[]>(() => {
    const current = this.selectedOperator();
    return [
      { value: '$eq', label: this.translate.instant('mediaLibrary.filters.is'), selected: current === '$eq' },
      { value: '$ne', label: this.translate.instant('mediaLibrary.filters.isNot'), selected: current === '$ne' },
      { value: '$gt', label: this.translate.instant('mediaLibrary.filters.greaterThan'), selected: current === '$gt' },
      { value: '$gte', label: this.translate.instant('mediaLibrary.filters.greaterOrEqual'), selected: current === '$gte' },
      { value: '$lt', label: this.translate.instant('mediaLibrary.filters.lessThan'), selected: current === '$lt' },
      { value: '$lte', label: this.translate.instant('mediaLibrary.filters.lessOrEqual'), selected: current === '$lte' }
    ];
  });

  // Operator options for mime avec selected
  mimeOperatorOptions = computed<ChoiceOption[]>(() => {
    const current = this.selectedOperator();
    return [
      { value: '$contains', label: this.translate.instant('mediaLibrary.filters.is'), selected: current === '$contains' },
      { value: '$notContains', label: this.translate.instant('mediaLibrary.filters.isNot'), selected: current === '$notContains' }
    ];
  });

  // Mime type options avec selected
  mimeTypeOptions = computed<ChoiceOption[]>(() => {
    const current = this.selectedValue();
    return [
      { value: 'audio', label: this.translate.instant('mediaLibrary.filters.audio'), selected: current === 'audio' },
      { value: 'file', label: this.translate.instant('mediaLibrary.filters.file'), selected: current === 'file' },
      { value: 'image', label: this.translate.instant('mediaLibrary.filters.image'), selected: current === 'image' },
      { value: 'video', label: this.translate.instant('mediaLibrary.filters.video'), selected: current === 'video' }
    ];
  });

  // Choice configs
  sortChoiceConfig = computed<ChoiceConfig>(() => ({
    searchEnabled: false,
    shouldSort: false,
    itemSelectText: '',
    removeItemButton: false,
    position: 'auto'
  }));

  filterChoiceConfig = computed<ChoiceConfig>(() => ({
    searchEnabled: false,
    shouldSort: false,
    itemSelectText: '',
    removeItemButton: true,
    position: 'auto'
  }));

  canAddFilter = computed(() => {
    return this.selectedField() && this.selectedOperator() && this.selectedValue();
  });

  onDateChange(value: string): void {
    this.valueChange.emit(value);
  }

  getFilterLabel(filter: MediaFilterField): string {
    const fieldLabel = this.translate.instant(`mediaLibrary.filters.${filter.field}`);
    const operatorLabel = this.getOperatorLabel(filter.operator);
    const valueLabel = this.getValueLabel(filter.field, filter.value);
    return `${fieldLabel} ${operatorLabel} ${valueLabel}`;
  }

  private getOperatorLabel(operator: string): string {
    const operatorMap: Record<string, string> = {
      '$eq': '=',
      '$ne': '≠',
      '$gt': '>',
      '$gte': '≥',
      '$lt': '<',
      '$lte': '≤',
      '$contains': this.translate.instant('mediaLibrary.filters.contains'),
      '$notContains': this.translate.instant('mediaLibrary.filters.notContains')
    };
    return operatorMap[operator] || operator;
  }

  private getValueLabel(field: string, value: string): string {
    if (field === 'mime') {
      return this.translate.instant(`mediaLibrary.filters.${value}`);
    }
    return value;
  }
}
