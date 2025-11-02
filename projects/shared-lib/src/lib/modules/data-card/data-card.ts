import { Component, input, output, signal, computed, OnInit, inject, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardAction, CardColumn } from './data-card.model';
import { PaginationState } from '../data-table';
import { SortConfig } from '../filter-bar/filter.model';
import { DropdownSingleDirective } from '../../directives';
import { EmptyStateComponent } from '../empty-state';
import { getInitialsByParamsName } from '../../utils';
import { UrlStateService, RelativeDateService } from '../../services';

@Component({
  selector: 'lib-data-card',
  imports: [CommonModule, TranslatePipe, EmptyStateComponent, DropdownSingleDirective],
  templateUrl: './data-card.html',
  styleUrls: ['./data-card.css']
})
export class DataCard<T = any> implements OnInit {

  private translate = inject(TranslateService);
  private urlState = inject(UrlStateService);
  private destroyRef = inject(DestroyRef);
  private relativeDateService = inject(RelativeDateService);

  // Inputs
  data = input.required<T[]>();
  columns = input.required<CardColumn<T>[]>();
  actions = input<CardAction<T>[]>([]);
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
  actionClick = output<{ action: CardAction<T>; row: T }>();
  cardClick = output<T>();
  selectionChange = output<T[]>();

  // State
  selectedCards = signal<Set<string>>(new Set());
  private initialized = signal(false);
  private langVersion = signal(0);

  // Computed
  hasActions = computed(() => (this.actions()?.length ?? 0) > 0);

  visibleColumns = computed(() =>
    this.columns().filter(col => col.showInCard !== false)
  );

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
    return data.every(card => this.isCardSelected(card));
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

  getAvatarUrl(card: T, column: CardColumn<T>): string {
    const avatarPath = this.getNestedValue(card, column.avatarKey!);

    if (!avatarPath) return '';

    if (column.avatarTransform) {
      return column.avatarTransform(avatarPath);
    }

    return avatarPath;
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onActionClick(action: CardAction<T>, card: T, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ action, row: card });
  }

  onCardClick(card: T): void {
    if (this.clickable()) {
      this.cardClick.emit(card);
    }
  }

  toggleCardSelection(card: any, event: Event): void {
    event.stopPropagation();
    const id = card.documentId || card.id;
    const selected = new Set(this.selectedCards());

    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }

    this.selectedCards.set(selected);
    this.emitSelection();
  }

  toggleAllCards(): void {
    const data = this.formattedData();
    const selected = new Set(this.selectedCards());

    if (this.allSelected()) {
      selected.clear();
    } else {
      data.forEach(card => {
        const id = (card as any).documentId || (card as any).id;
        selected.add(id);
      });
    }

    this.selectedCards.set(selected);
    this.emitSelection();
  }

  isCardSelected(card: any): boolean {
    const id = card.documentId || card.id;
    return this.selectedCards().has(id);
  }

  private emitSelection(): void {
    const data = this.data();
    const selected = Array.from(this.selectedCards());
    const selectedData = data.filter(card =>
      selected.includes((card as any).documentId || (card as any).id)
    );
    this.selectionChange.emit(selectedData);
  }

  getCellValue(card: any, column: CardColumn<T>): any {
    if (column.type === 'date') {
      return card[`__formatted_${column.key}`] || this.getNestedValue(card, column.key);
    }

    if (column.render) {
      return column.render(card);
    }

    if (column.format) {
      const value = this.getNestedValue(card, column.key);
      return column.format(value);
    }

    return this.getNestedValue(card, column.key);
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  getCellClass(card: T, column: CardColumn<T>): string {
    if (typeof column.cellClass === 'function') {
      return column.cellClass(card);
    }
    return column.cellClass || '';
  }

  shouldShowAction(action: CardAction<T>, card: T): boolean {
    return action.condition ? action.condition(card) : true;
  }
}
