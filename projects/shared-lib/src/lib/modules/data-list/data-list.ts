import { Component, input, output, signal, computed, OnInit, inject, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListAction, ListColumn } from './data-list.model';
import { SortConfig } from '../filter-bar/filter.model';
import { DropdownSingleDirective } from '../../directives';
import { EmptyStateComponent } from '../empty-state';
import { getInitialsByParamsName } from '../../utils';
import { UrlStateService, RelativeDateService } from '../../services';
import {PaginationState} from './pagination.model';

@Component({
  selector: 'lib-data-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DropdownSingleDirective, EmptyStateComponent],
  templateUrl: './data-list.html',
  styleUrls: ['./data-list.css']
})
export class DataList<T = any> implements OnInit {

  private translate = inject(TranslateService);
  private urlState = inject(UrlStateService);
  private destroyRef = inject(DestroyRef);
  private relativeDateService = inject(RelativeDateService);

  // Inputs
  data = input.required<T[]>();
  columns = input.required<ListColumn<T>[]>();
  actions = input<ListAction<T>[]>([]);
  loading = input<boolean>(false);
  pagination = input<PaginationState | null>(null);
  currentSort = input<SortConfig | null>(null);
  selectable = input<boolean>(false);
  clickable = input<boolean>(false);
  enableUrlSync = input<boolean>(true);
  view = input<'table' | 'card'>('table');

  emptyStateTitle = input.required<string>();
  emptyStateMessage = input.required<string>();
  emptyStateIcon = input<string>('inbox');

  // Outputs
  sortChange = output<SortConfig>();
  pageChange = output<number>();
  actionClick = output<{ action: ListAction<T>; row: T }>();
  itemClick = output<T>();
  selectionChange = output<T[]>();
  selectionCountChange = output<number>();

  // State
  selectedItems = signal<Set<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedItems().size);
  private initialized = signal(false);
  private langVersion = signal(0);

  // Expose Math to template
  protected readonly Math = Math;

  // Computed
  hasActions = computed(() => (this.actions()?.length ?? 0) > 0);

  visibleColumns = computed(() => {
    if (this.view() === 'card') {
      return this.columns().filter(col => col.showInCard !== false);
    }
    return this.columns();
  });

  formattedData = computed(() => {
    this.langVersion();
    return this.data().map(item => {
      const formatted: any = { ...item };

      this.columns().forEach(column => {
        if (column.type === 'date') {
          const value = this.getNestedValue(item, column.key);
          if (value) {
            formatted[`__formatted_${column.key}`] = this.relativeDateService.formatRelativeDate(value);
          }
        }
      });

      return formatted;
    });
  });

  allSelected = computed(() => {
    const data = this.formattedData();
    if (data.length === 0) return false;
    return data.every(item => this.isItemSelected(item));
  });

  getTotalColspan = computed(() => {
    let total = this.columns().reduce((sum, col) => sum + (col.colspan || 1), 0);
    if (this.selectable()) total += 1;
    return total;
  });

  constructor() {
    effect(() => {
      if (this.enableUrlSync() && this.initialized()) {
        const pagination = this.pagination();
        if (pagination) {
          this.urlState.syncToUrl({ page: pagination.currentPage });
        }
      }
    });

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.langVersion.update(v => v + 1);
      });
  }

  ngOnInit(): void {
    if (this.enableUrlSync()) {
      const state = this.urlState.getStateFromUrl();
      if (state.page && this.pagination()) {
        const targetPage = state.page;
        if (targetPage !== this.pagination()!.currentPage) {
          this.pageChange.emit(targetPage);
        }
      }
    }

    this.initialized.set(true);
  }

  getInitials(name: string): string {
    return getInitialsByParamsName(name);
  }

  getTotalPages(): number {
    const pagination = this.pagination();
    return pagination ? pagination.pageCount : 1;
  }

  getPageNumbers(): number[] {
    const pagination = this.pagination();
    if (!pagination) return [];

    const currentPage = pagination.currentPage;
    const totalPages = pagination.pageCount;
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push(-1);
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push(-1);
    }

    pages.push(totalPages);

    return pages;
  }

  getSortIcon(column: ListColumn<T>): string {
    const currentSort = this.currentSort();
    if (!currentSort || currentSort.field !== column.key) {
      return 'unfold_more';
    }
    return currentSort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  getAvatarUrl(item: T, column: ListColumn<T>): string {
    const avatarPath = this.getNestedValue(item, column.avatarKey!);

    if (!avatarPath) return '';

    if (column.avatarTransform) {
      return column.avatarTransform(avatarPath);
    }

    return avatarPath;
  }

  onSort(column: ListColumn<T>): void {
    if (!column.sortable) return;

    const currentSort = this.currentSort();
    const newDirection =
      currentSort?.field === column.key && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';

    this.sortChange.emit({ field: column.key, direction: newDirection });
  }

  onPageChange(page: number): void {
    if (page < 1) return;
    const pagination = this.pagination();
    if (pagination && page > pagination.pageCount) return;

    this.pageChange.emit(page);
  }

  onActionClick(action: ListAction<T>, item: T, event: Event): void {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const dropdownItem = target.closest('.dropdown-item');

    if (dropdownItem) {
      const dropdownMenu = dropdownItem.closest('.dropdown-menu');
      const dropdown = dropdownMenu?.parentElement;

      if (dropdown) {
        const toggleButton = dropdown.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement;

        if (toggleButton && typeof (window as any).bootstrap !== 'undefined') {
          const bsDropdown = (window as any).bootstrap.Dropdown.getInstance(toggleButton);
          if (bsDropdown) {
            bsDropdown.hide();
          }
        }
      }
    }

    this.actionClick.emit({ action, row: item });
  }

  onItemClick(item: T): void {
    if (this.clickable()) {
      this.itemClick.emit(item);
    }
  }

  toggleItemSelection(item: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const id = item.documentId || item.id;
    const selected = new Set(this.selectedItems());

    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }

    this.selectedItems.set(selected);
    this.emitSelection();
    this.selectionCountChange.emit(this.selectedCount());
  }

  toggleAllItems(): void {
    const data = this.formattedData();
    const selected = new Set(this.selectedItems());

    if (this.allSelected()) {
      selected.clear();
    } else {
      data.forEach(item => {
        const id = (item as any).documentId || (item as any).id;
        selected.add(id);
      });
    }

    this.selectedItems.set(selected);
    this.emitSelection();
    this.selectionCountChange.emit(this.selectedCount());
  }

  isItemSelected(item: any): boolean {
    const id = item.documentId || item.id;
    return this.selectedItems().has(id);
  }

  private emitSelection(): void {
    const data = this.data();
    const selected = Array.from(this.selectedItems());
    const selectedData = data.filter(item =>
      selected.includes((item as any).documentId || (item as any).id)
    );
    this.selectionChange.emit(selectedData);
  }

  getCellValue(item: any, column: ListColumn<T>): any {
    if (column.type === 'date') {
      return item[`__formatted_${column.key}`] || this.getNestedValue(item, column.key);
    }

    if (column.render) {
      return column.render(item);
    }

    if (column.format) {
      const value = this.getNestedValue(item, column.key);
      return column.format(value);
    }

    return this.getNestedValue(item, column.key);
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  getCellClass(item: T, column: ListColumn<T>): string {
    if (typeof column.cellClass === 'function') {
      return column.cellClass(item);
    }
    return column.cellClass || '';
  }

  shouldShowAction(action: ListAction<T>, item: T): boolean {
    return action.condition ? action.condition(item) : true;
  }
}
