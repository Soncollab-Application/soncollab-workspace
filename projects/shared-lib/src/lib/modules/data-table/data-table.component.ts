import {Component, input, output, signal, computed, OnInit, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';
import {TableAction, TableColumn} from './table.model';
import {PaginationState} from './pagination.model';
import {SortConfig} from '../filter-bar/filter.model';

@Component({
  selector: 'lib-data-table',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent<T = any> implements OnInit {
  private translate = inject(TranslateService);

  // Inputs
  data = input.required<T[]>();
  columns = input.required<TableColumn<T>[]>();
  actions = input<TableAction<T>[]>([]);
  loading = input<boolean>(false);
  pagination = input<PaginationState | null>(null);
  currentSort = input<SortConfig | null>(null);
  selectable = input<boolean>(false);
  clickable = input<boolean>(false);

  // Outputs
  sortChange = output<SortConfig>();
  pageChange = output<number>();
  actionClick = output<{ action: TableAction<T>; row: T }>();
  rowClick = output<T>();
  selectionChange = output<T[]>();

  // State
  selectedRows = signal<Set<string>>(new Set());

  // Computed
  hasActions = computed(() => (this.actions()?.length ?? 0) > 0);
  allSelected = computed(() => {
    const dataLength = this.data().length;
    return dataLength > 0 && this.selectedRows().size === dataLength;
  });

  ngOnInit(): void {
    this.translate.setTranslation('en', { dataTable: enTranslations.dataTable }, true);
    this.translate.setTranslation('fr', { dataTable: frTranslations.dataTable }, true);
  }

  getSortIcon(column: TableColumn<T>): string {
    const sort = this.currentSort();
    if (!sort || sort.field !== column.key) return 'bi-arrow-down-up';
    return sort.direction === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  onSort(column: TableColumn<T>): void {
    if (!column.sortable) return;

    const currentSort = this.currentSort();
    const newDirection =
      currentSort?.field === column.key && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';

    this.sortChange.emit({ field: column.key, direction: newDirection });
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onActionClick(action: TableAction<T>, row: T, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ action, row });
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  toggleRowSelection(row: any): void {
    const id = row.documentId || row.id;
    const selected = new Set(this.selectedRows());

    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }

    this.selectedRows.set(selected);
    this.emitSelection();
  }

  toggleAllRows(): void {
    const data = this.data();
    const selected = new Set(this.selectedRows());

    if (this.allSelected()) {
      selected.clear();
    } else {
      data.forEach(row => {
        const id = (row as any).documentId || (row as any).id;
        selected.add(id);
      });
    }

    this.selectedRows.set(selected);
    this.emitSelection();
  }

  isRowSelected(row: any): boolean {
    const id = row.documentId || row.id;
    return this.selectedRows().has(id);
  }

  private emitSelection(): void {
    const data = this.data();
    const selected = Array.from(this.selectedRows());
    const selectedData = data.filter(row =>
      selected.includes((row as any).documentId || (row as any).id)
    );
    this.selectionChange.emit(selectedData);
  }

  getCellValue(row: T, column: TableColumn<T>): any {
    if (column.render) {
      return column.render(row);
    }
    return (row as any)[column.key];
  }

  getCellClass(row: T, column: TableColumn<T>): string {
    if (typeof column.cellClass === 'function') {
      return column.cellClass(row);
    }
    return column.cellClass || '';
  }

  shouldShowAction(action: TableAction<T>, row: T): boolean {
    return action.condition ? action.condition(row) : true;
  }

  getPageNumbers(): number[] {
    const pag = this.pagination();
    if (!pag) return [];

    const pages: number[] = [];
    const current = pag.currentPage;
    const total = pag.pageCount;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1, total);
      } else if (current >= total - 3) {
        pages.push(1, -1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1, -1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1, total);
      }
    }

    return pages;
  }

  protected readonly Math = Math;
}
