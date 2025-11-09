import { computed, Injectable, signal } from '@angular/core';
import {
  MediaItem,
  MediaPickerConfig,
  MediaPickerState,
  MediaFilter,
  ViewMode,
  ActiveTab,
  MediaType,
  FilterField,
  FilterOperator,
  AdvancedFilter
} from './media-picker.model';

@Injectable({ providedIn: 'root' })
export class MediaPickerService {
  private state = signal<MediaPickerState>({
    isOpen: false,
    selectedItems: [],
    config: {
      multiple: false,
      accept: ['image'],
      maxSelection: 1,
      showUpload: true,
      maxFileSize: 10 * 1024 * 1024,
      allowFolderCreation: true,
      allowUrlUpload: true
    }
  });

  private filter = signal<MediaFilter>({
    search: '',
    type: 'all',
    folder: null,
    folderPath: ['Media Library'],
    sortBy: 'date',
    sortOrder: 'desc',
    advancedFilter: null
  });

  private viewMode = signal<ViewMode>('grid');
  private activeTab = signal<ActiveTab>('browse');
  private showFilters = signal(false);

  isOpen = computed(() => this.state().isOpen);
  selectedItems = computed(() => this.state().selectedItems);
  config = computed(() => this.state().config);
  currentFilter = computed(() => this.filter());
  currentViewMode = computed(() => this.viewMode());
  currentActiveTab = computed(() => this.activeTab());
  filtersVisible = computed(() => this.showFilters());

  open(config: MediaPickerConfig, onSelect: (items: MediaItem[]) => void): void {
    const mergedConfig: MediaPickerConfig = {
      multiple: false,
      accept: ['image'],
      maxSelection: 1,
      showUpload: true,
      maxFileSize: 10 * 1024 * 1024,
      allowFolderCreation: true,
      allowUrlUpload: true,
      ...config
    };

    this.state.set({
      isOpen: true,
      selectedItems: [],
      config: mergedConfig,
      onSelect
    });
  }

  close(): void {
    this.state.update(state => ({
      ...state,
      isOpen: false,
      selectedItems: []
    }));
    this.resetFilters();
  }

  selectItem(item: MediaItem): void {
    const currentState = this.state();
    const isAlreadySelected = currentState.selectedItems.some(i => i.id === item.id);

    if (isAlreadySelected) {
      this.state.update(state => ({
        ...state,
        selectedItems: state.selectedItems.filter(i => i.id !== item.id)
      }));
    } else {
      if (!currentState.config.multiple) {
        this.state.update(state => ({
          ...state,
          selectedItems: [item]
        }));
      } else {
        const maxSelection = currentState.config.maxSelection || Infinity;
        if (currentState.selectedItems.length < maxSelection) {
          this.state.update(state => ({
            ...state,
            selectedItems: [...state.selectedItems, item]
          }));
        }
      }
    }
  }

  selectAll(items: MediaItem[]): void {
    const currentState = this.state();
    if (!currentState.config.multiple) return;

    const maxSelection = currentState.config.maxSelection || Infinity;
    const itemsToAdd = items.filter(item =>
      !currentState.selectedItems.some(selected => selected.id === item.id)
    );

    const totalItems = currentState.selectedItems.length + itemsToAdd.length;
    const canAddAll = totalItems <= maxSelection;

    if (canAddAll) {
      this.state.update(state => ({
        ...state,
        selectedItems: [...state.selectedItems, ...itemsToAdd]
      }));
    } else {
      const remainingSlots = maxSelection - currentState.selectedItems.length;
      this.state.update(state => ({
        ...state,
        selectedItems: [...state.selectedItems, ...itemsToAdd.slice(0, remainingSlots)]
      }));
    }
  }

  deselectAll(): void {
    this.state.update(state => ({
      ...state,
      selectedItems: []
    }));
  }

  removeSelectedItem(itemId: number): void {
    this.state.update(state => ({
      ...state,
      selectedItems: state.selectedItems.filter(i => i.id !== itemId)
    }));
  }

  isSelected(itemId: number): boolean {
    return this.state().selectedItems.some(item => item.id === itemId);
  }

  confirm(): void {
    const currentState = this.state();
    if (currentState.onSelect && currentState.selectedItems.length > 0) {
      currentState.onSelect(currentState.selectedItems);
    }
    this.close();
  }

  setSearch(search: string): void {
    this.filter.update(f => ({ ...f, search }));
  }

  setType(type: MediaType | 'all'): void {
    this.filter.update(f => ({ ...f, type }));
  }

  setFolder(folderId: string | null, folderName?: string): void {
    const currentPath = this.filter().folderPath;

    if (folderId === null || folderId === 'root') {
      this.filter.update(f => ({
        ...f,
        folder: null,
        folderPath: ['Media Library']
      }));
    } else {
      const newPath = folderName ? [...currentPath, folderName] : currentPath;
      this.filter.update(f => ({
        ...f,
        folder: folderId,
        folderPath: newPath
      }));
    }
  }

  navigateToPathLevel(index: number): void {
    const currentPath = this.filter().folderPath;
    const newPath = currentPath.slice(0, index + 1);

    this.filter.update(f => ({
      ...f,
      folder: index === 0 ? null : f.folder,
      folderPath: newPath
    }));
  }

  setSortBy(sortBy: 'name' | 'date' | 'size'): void {
    this.filter.update(f => ({ ...f, sortBy }));
  }

  setSortOrder(sortOrder: 'asc' | 'desc'): void {
    this.filter.update(f => ({ ...f, sortOrder }));
  }

  setAdvancedFilter(filter: AdvancedFilter | null): void {
    this.filter.update(f => ({ ...f, advancedFilter: filter }));
  }

  resetFilters(): void {
    this.filter.set({
      search: '',
      type: 'all',
      folder: null,
      folderPath: ['Media Library'],
      sortBy: 'date',
      sortOrder: 'desc',
      advancedFilter: null
    });
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  setActiveTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  getState(): MediaPickerState {
    return this.state();
  }
}
