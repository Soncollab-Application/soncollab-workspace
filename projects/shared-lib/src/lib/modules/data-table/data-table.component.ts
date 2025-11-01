import {Component, input, output, signal, computed, OnInit, inject, effect, DestroyRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {TableAction, TableColumn} from './table.model';
import {PaginationState} from './pagination.model';
import {SortConfig} from '../filter-bar/filter.model';
import {DropdownSingleDirective} from '../../directives';
import {EmptyStateComponent} from '../empty-state';
import {getInitialsByParamsName} from '../../utils';
import {UrlStateService} from '../../services';
import {RelativeDateService} from '../../services';

@Component({
  selector: 'lib-data-table',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DropdownSingleDirective, EmptyStateComponent],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent<T = any> implements OnInit {

  private translate = inject(TranslateService);
  private urlState = inject(UrlStateService);
  private destroyRef = inject(DestroyRef);
  private relativeDateService = inject(RelativeDateService);

  // Inputs
  data = input.required<T[]>();
  columns = input.required<TableColumn<T>[]>();
  actions = input<TableAction<T>[]>([]);
  loading = input<boolean>(false);
  pagination = input<PaginationState | null>(null);
  currentSort = input<SortConfig | null>(null);
  selectable = input<boolean>(false);
  clickable = input<boolean>(false);
  enableUrlSync = input<boolean>(true);

  emptyStateTitle = input.required<string>();
  emptyStateMessage = input.required<string>();
  emptyStateIcon = input<string>('inbox');

  // Outputs
  sortChange = output<SortConfig>();
  pageChange = output<number>();
  actionClick = output<{ action: TableAction<T>; row: T }>();
  rowClick = output<T>();
  selectionChange = output<T[]>();

  // State
  selectedRows = signal<Set<string>>(new Set());
  private initialized = signal(false);

  // Signal pour forcer la mise à jour lors du changement de langue
  private langVersion = signal(0);

  // Computed
  hasActions = computed(() => (this.actions()?.length ?? 0) > 0);
  allSelected = computed(() => {
    const dataLength = this.data().length;
    return dataLength > 0 && this.selectedRows().size === dataLength;
  });

  // Computed pour formater les données avec la langue actuelle
  formattedData = computed(() => {
    // Force la réévaluation quand la langue change
    const _ = this.langVersion();
    const rawData = this.data();
    const cols = this.columns();

    return rawData.map(row => {
      const formatted: any = { ...row };
      cols.forEach(col => {
        if (col.type === 'date') {
          const value = this.getNestedValue(row, col.key);
          if (value) {
            formatted[`__formatted_${col.key}`] = this.relativeDateService.formatRelativeDate(value);
          }
        }
      });
      return formatted;
    });
  });

  constructor() {
    // Écoute les changements de langue
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.langVersion.update(v => v + 1);
      });

    // Force un refresh initial quand les traductions sont chargées
    this.translate.onTranslationChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.langVersion.update(v => v + 1);
      });

    // Initialiser page depuis URL
    effect(() => {
      if (!this.initialized() && this.enableUrlSync()) {
        const urlState = this.urlState.getStateFromUrl();
        if (urlState.page) {
          this.pageChange.emit(urlState.page);
        }
        this.initialized.set(true);
      }
    });

    // Sync page vers URL
    effect(() => {
      if (!this.initialized() || !this.enableUrlSync()) return;
      const page = this.pagination()?.currentPage;
      if (page) {
        this.urlState.syncToUrl({ page });
      }
    });
  }

  ngOnInit(): void {
    // Force un refresh initial
    this.langVersion.update(v => v + 1);
  }

  getInitials(name: any): string {
    return getInitialsByParamsName(name);
  }

  getTotalColspan(): number {
    const columnsCount = this.columns().reduce((sum, col) => sum + (col.colspan || 1), 0);
    const selectableCol = this.selectable() ? 1 : 0;
    return columnsCount + selectableCol;
  }

  getSortIcon(column: TableColumn<T>): string {
    const sort = this.currentSort();
    if (!sort || sort.field !== column.key) return 'swap_vert';
    return sort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  getAvatarUrl(row: T, column: TableColumn<T>): string {
    const avatarPath = this.getNestedValue(row, column.avatarKey!);

    if (!avatarPath) return '';

    if (column.avatarTransform) {
      return column.avatarTransform(avatarPath);
    }

    return avatarPath;
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
    this.actionClick.emit({ action, row });
  }

  onRowClick(row: T): void {
    if (this.clickable()) {
      this.rowClick.emit(row);
    }
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
    const data = this.formattedData();
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

  getCellValue(row: any, column: TableColumn<T>): any {
    // Si c'est une date, utilise la valeur formatée
    if (column.type === 'date') {
      return row[`__formatted_${column.key}`] || this.getNestedValue(row, column.key);
    }

    if (column.render) {
      return column.render(row);
    }

    if (column.format) {
      const value = this.getNestedValue(row, column.key);
      return column.format(value);
    }

    return this.getNestedValue(row, column.key);
  }


  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
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
