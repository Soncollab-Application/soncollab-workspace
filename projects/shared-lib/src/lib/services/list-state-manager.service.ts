import { Injectable, Signal, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import {FilterValue, SortConfig } from "../modules";
import { FilterStateService } from "./filter-state.service";
import { LanguageOrchestratorService } from "./language-orchestrator.service";
import { PermissionService } from "./permission.service";
import { PaginationState } from "../modules";

export interface ListStateConfig {
  componentId: string;
  defaultSort: SortConfig;
  pageSize: number;
  onLanguageChange?: () => void;
}

export interface LoadCallback<TFilters> {
  (page: number, pageSize: number, filters: TFilters, sortField: string, sortDirection: 'asc' | 'desc'): void;
}

@Injectable()
export class ListStateManager<TItem, TFilters> {
  private filterState = inject(FilterStateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionsService = inject(PermissionService);

  // Signals publics
  readonly items: WritableSignal<TItem[]> = signal([]);
  readonly loading: WritableSignal<boolean> = signal(false);
  readonly totalItems: WritableSignal<number> = signal(0);
  readonly pageCount: WritableSignal<number> = signal(0);
  readonly stats: WritableSignal<any> = signal(null);
  readonly loadingStats: WritableSignal<boolean> = signal(false);

  private pageSize: WritableSignal<number> = signal(10);
  private loadingState: WritableSignal<'idle' | 'loading' | 'loaded' | 'error'> = signal('idle');
  private destroy$ = new Subject<void>();

  // Computed publics
  readonly currentSort = computed(() => this.filterState.state().sort);
  readonly pagination = computed<PaginationState>(() => ({
    currentPage: this.filterState.state().page,
    pageSize: this.pageSize(),
    total: this.totalItems(),
    pageCount: this.pageCount()
  }));

  private config?: ListStateConfig;
  private buildFiltersCallback?: (search: string, filters: FilterValue) => TFilters;
  private loadItemsCallback?: LoadCallback<TFilters>;
  private canFindSignal?: Signal<boolean>; // Ajout pour stocker le signal

  constructor() {
    // Effect principal pour le chargement
    effect(() => {
      if (!this.filterState.initialized() || !this.config || !this.canFindSignal) {
        return;
      }

      const currentLoadingState = this.loadingState();
      const shouldLoadDueToStateChange = this.filterState.shouldLoad();

      if (shouldLoadDueToStateChange && currentLoadingState !== 'idle') {
        untracked(() => this.loadingState.set('idle'));
      }

      const shouldLoad = shouldLoadDueToStateChange || currentLoadingState === 'idle';

      if (!shouldLoad || currentLoadingState === 'loading') {
        return;
      }

      const state = this.filterState.state();

      untracked(() => {
        if (this.canFindSignal!() && this.buildFiltersCallback) {
          this.triggerLoad(
            state.page,
            this.pageSize(),
            this.buildFiltersCallback(state.search, state.filters),
            state.sort.field || this.config!.defaultSort.field,
            state.sort.direction
          );
        }
      });
    });
  }

  /**
   * Initialise le manager avec la configuration
   */
  initialize(
    config: ListStateConfig,
    buildFilters: (search: string, filters: FilterValue) => TFilters,
    loadItems: LoadCallback<TFilters>,
    canFind: Signal<boolean>
  ): void {

    this.config = config;
    this.buildFiltersCallback = buildFilters;
    this.loadItemsCallback = loadItems;
    this.canFindSignal = canFind;
    this.pageSize.set(config.pageSize);

    this.languageOrchestrator.registerComponent(
      config.componentId,
      () => {
        if (config.onLanguageChange) {
          config.onLanguageChange();
        }
      }
    );

    this.filterState.initialize(config.defaultSort, config.componentId);
  }

  /**
   * Déclenche le chargement des données
   */
  private triggerLoad(
    page: number,
    pageSize: number,
    filters: TFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    if (!this.loadItemsCallback) return;

    this.loadingState.set('loading');
    this.loading.set(true);
    this.loadItemsCallback(page, pageSize, filters, sortField, sortDirection);
  }

  /**
   * Met à jour les données après chargement
   */
  setData(items: TItem[], total: number, pageCount: number): void {
    this.items.set(items);
    this.totalItems.set(total);
    this.pageCount.set(pageCount);
    this.loading.set(false);
    this.loadingState.set('loaded');
  }

  /**
   * Gère une erreur de chargement
   */
  setError(): void {
    this.loading.set(false);
    this.loadingState.set('error');
  }

  /**
   * Recharge avec l'état actuel
   */
  reload(): void {
    if (!this.config || !this.buildFiltersCallback || !this.loadItemsCallback) return;

    const state = this.filterState.state();
    this.triggerLoad(
      state.page,
      this.pageSize(),
      this.buildFiltersCallback(state.search, state.filters),
      state.sort.field || this.config.defaultSort.field,
      state.sort.direction
    );
  }

  /**
   * Change de page
   */
  onPageChange(page: number): void {
    this.filterState.setPage(page);
  }

  /**
   * Change le tri
   */
  onSortChange(sort: SortConfig): void {
    this.filterState.setSort(sort);
  }

  /**
   * Vérifie une permission
   */
  hasPermission(resource: string, type: string, action: string): boolean {
    return this.permissionsService.hasPermission(resource, type, action);
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    if (this.config) {
      this.languageOrchestrator.unregisterComponent(this.config.componentId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
