import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { Choice, ChoiceOption } from '../choice-lib';
import { MediaPickerService } from './media-picker.service';
import {
  MediaItem,
  MediaFolder,
  MediaType,
  ViewMode,
  ActiveTab,
  UploadMode,
  FilterField,
  FilterOperator,
  AdvancedFilter
} from './media-picker.model';

@Component({
  selector: 'lib-media-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, Choice],
  templateUrl: './media-picker.html',
  styleUrl: './media-picker.css'
})
export class MediaPicker implements OnDestroy {
  public mediaService = inject(MediaPickerService);
  private destroy$ = new Subject<void>();

  @Input() items: MediaItem[] = [];
  @Input() folders: MediaFolder[] = [];
  @Input() loading = false;

  @Output() itemsSelected = new EventEmitter<MediaItem[]>();
  @Output() filesUploaded = new EventEmitter<File[]>();
  @Output() urlUploaded = new EventEmitter<string>();
  @Output() filterChanged = new EventEmitter<any>();
  @Output() folderCreated = new EventEmitter<{ name: string; parentId: string | null }>();
  @Output() itemDeleted = new EventEmitter<number>();
  @Output() itemEdited = new EventEmitter<MediaItem>();

  isOpen = computed(() => this.mediaService.isOpen());
  selectedItems = computed(() => this.mediaService.selectedItems());
  config = computed(() => this.mediaService.config());
  filter = computed(() => this.mediaService.currentFilter());
  viewMode = computed(() => this.mediaService.currentViewMode());
  activeTab = computed(() => this.mediaService.currentActiveTab());
  showFilters = computed(() => this.mediaService.filtersVisible());

  uploadMode = signal<UploadMode>('computer');
  isDragging = signal(false);
  urlInput = signal('');
  showNewFolderModal = signal(false);
  newFolderName = signal('');
  editingItem = signal<MediaItem | null>(null);
  editingName = signal('');

  // Advanced filter signals
  advancedFilterField = signal<FilterField | null>(null);
  advancedFilterOperator = signal<FilterOperator | null>(null);
  advancedFilterValue = signal<string>('');
  advancedFilterDate = signal<string>('');

  typeOptions = computed<ChoiceOption[]>(() => {
    const currentType = this.filter().type;
    return [
      { value: 'all', label: 'All types', selected: currentType === 'all' },
      { value: 'image', label: 'Images', selected: currentType === 'image' },
      { value: 'video', label: 'Videos', selected: currentType === 'video' },
      { value: 'audio', label: 'Audio', selected: currentType === 'audio' },
      { value: 'document', label: 'Documents', selected: currentType === 'document' }
    ];
  });

  filterFieldOptions: ChoiceOption[] = [
    { value: '', label: 'Select field...', disabled: true, selected: true },
    { value: 'createdAt', label: 'Created At' },
    { value: 'updatedAt', label: 'Updated At' },
    { value: 'type', label: 'Type' }
  ];

  operatorOptions = computed<ChoiceOption[]>(() => {
    const field = this.advancedFilterField();

    if (field === 'type') {
      return [
        { value: '', label: 'Select operator...', disabled: true, selected: !this.advancedFilterOperator() },
        { value: 'is', label: 'is', selected: this.advancedFilterOperator() === 'is' },
        { value: 'isNot', label: 'is not', selected: this.advancedFilterOperator() === 'isNot' }
      ];
    }

    return [
      { value: '', label: 'Select operator...', disabled: true, selected: !this.advancedFilterOperator() },
      { value: 'is', label: 'is', selected: this.advancedFilterOperator() === 'is' },
      { value: 'isNot', label: 'is not', selected: this.advancedFilterOperator() === 'isNot' },
      { value: 'greaterThan', label: 'is greater than', selected: this.advancedFilterOperator() === 'greaterThan' },
      { value: 'greaterThanOrEqual', label: 'is greater than or equal', selected: this.advancedFilterOperator() === 'greaterThanOrEqual' },
      { value: 'lowerThan', label: 'is lower than', selected: this.advancedFilterOperator() === 'lowerThan' },
      { value: 'lowerThanOrEqual', label: 'is lower than or equal', selected: this.advancedFilterOperator() === 'lowerThanOrEqual' }
    ];
  });

  valueOptions = computed<ChoiceOption[]>(() => {
    return [
      { value: '', label: 'Select type...', disabled: true, selected: !this.advancedFilterValue() },
      { value: 'image', label: 'Image', selected: this.advancedFilterValue() === 'image' },
      { value: 'video', label: 'Video', selected: this.advancedFilterValue() === 'video' },
      { value: 'audio', label: 'Audio', selected: this.advancedFilterValue() === 'audio' },
      { value: 'document', label: 'Document', selected: this.advancedFilterValue() === 'document' },
      { value: 'archive', label: 'Archive', selected: this.advancedFilterValue() === 'archive' },
      { value: 'other', label: 'Other', selected: this.advancedFilterValue() === 'other' }
    ];
  });

  filteredItems = computed(() => {
    let result = [...this.items];
    const currentFilter = this.filter();

    // Filter par dossier
    const currentFolderId = currentFilter.folder;
    if (currentFolderId === null) {
      result = result.filter(item => !item.folder || item.folder === 'root');
    } else {
      result = result.filter(item => item.folder === currentFolderId);
    }

    // Filter par recherche
    if (currentFilter.search) {
      const searchLower = currentFilter.search.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.alt?.toLowerCase().includes(searchLower) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter par type
    if (currentFilter.type !== 'all') {
      result = result.filter(item => item.type === currentFilter.type);
    }

    // Advanced filter
    if (currentFilter.advancedFilter) {
      result = this.applyAdvancedFilter(result, currentFilter.advancedFilter);
    }

    // Tri
    result.sort((a, b) => {
      let comparison = 0;
      switch (currentFilter.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      return currentFilter.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  filteredFolders = computed(() => {
    const searchLower = this.filter().search.toLowerCase();
    const currentFolder = this.filter().folder;

    let result: MediaFolder[];

    if (currentFolder === null) {
      result = this.folders.filter(f => !f.parentId || f.parentId === 'root');
    } else {
      result = this.folders.filter(f => f.parentId === currentFolder);
    }

    if (searchLower) {
      result = result.filter(folder =>
        folder.name.toLowerCase().includes(searchLower)
      );
    }

    return result;
  });

  currentFolderPath = computed(() => this.filter().folderPath);

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      if (isOpen) {
        console.log('📸 MediaPicker opened');
        console.log('📸 Items:', this.items.length);
        console.log('📸 FilteredItems:', this.filteredItems().length);
        console.log('📸 Current folder:', this.filter().folder);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyAdvancedFilter(items: MediaItem[], filter: AdvancedFilter): MediaItem[] {
    if (!filter.field || !filter.operator || filter.value === null) {
      return items;
    }

    return items.filter(item => {
      const field = filter.field!;
      const operator = filter.operator!;
      const value = filter.value!;

      if (field === 'type') {
        const itemValue = item.type;
        if (operator === 'is') return itemValue === value;
        if (operator === 'isNot') return itemValue !== value;
        return false;
      }

      const itemDate = new Date(field === 'createdAt' ? item.createdAt : item.updatedAt);
      const filterDate = new Date(value as string);

      switch (operator) {
        case 'is':
          return itemDate.toDateString() === filterDate.toDateString();
        case 'isNot':
          return itemDate.toDateString() !== filterDate.toDateString();
        case 'greaterThan':
          return itemDate > filterDate;
        case 'greaterThanOrEqual':
          return itemDate >= filterDate;
        case 'lowerThan':
          return itemDate < filterDate;
        case 'lowerThanOrEqual':
          return itemDate <= filterDate;
        default:
          return false;
      }
    });
  }

  close(): void {
    this.mediaService.close();
  }

  confirm(): void {
    this.itemsSelected.emit(this.selectedItems());
    this.mediaService.confirm();
  }

  setActiveTab(tab: ActiveTab): void {
    this.mediaService.setActiveTab(tab);
  }

  toggleFilters(): void {
    this.mediaService.toggleFilters();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mediaService.setSearch(input.value);
    this.emitFilterChanged();
  }

  onTypeChange(value: any): void {
    this.mediaService.setType(value as MediaType | 'all');
    this.emitFilterChanged();
  }

  onSortByChange(value: any): void {
    this.mediaService.setSortBy(value as 'name' | 'date' | 'size');
    this.emitFilterChanged();
  }

  onSortOrderChange(value: any): void {
    this.mediaService.setSortOrder(value as 'asc' | 'desc');
    this.emitFilterChanged();
  }

  onAdvancedFilterFieldChange(value: any): void {
    this.advancedFilterField.set(value as FilterField);
    this.advancedFilterOperator.set(null);
    this.advancedFilterValue.set('');
    this.advancedFilterDate.set('');
    this.updateAdvancedFilter();
  }

  onAdvancedFilterOperatorChange(value: any): void {
    this.advancedFilterOperator.set(value as FilterOperator);
    this.updateAdvancedFilter();
  }

  onAdvancedFilterValueChange(value: any): void {
    this.advancedFilterValue.set(value);
    this.updateAdvancedFilter();
  }

  onAdvancedFilterDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.advancedFilterDate.set(input.value);
    this.updateAdvancedFilter();
  }

  updateAdvancedFilter(): void {
    const field = this.advancedFilterField();
    const operator = this.advancedFilterOperator();

    let value: string | null = null;

    if (field === 'type') {
      value = this.advancedFilterValue() || null;
    } else {
      value = this.advancedFilterDate() || null;
    }

    if (field && operator && value) {
      this.mediaService.setAdvancedFilter({ field, operator, value });
      this.emitFilterChanged();
    } else {
      this.mediaService.setAdvancedFilter(null);
    }
  }

  clearAdvancedFilter(): void {
    this.advancedFilterField.set(null);
    this.advancedFilterOperator.set(null);
    this.advancedFilterValue.set('');
    this.advancedFilterDate.set('');
    this.mediaService.setAdvancedFilter(null);
    this.emitFilterChanged();
  }

  onResetFilters(): void {
    this.clearAdvancedFilter();
    this.mediaService.resetFilters();
    this.emitFilterChanged();
  }

  emitFilterChanged(): void {
    this.filterChanged.emit(this.filter());
  }

  setViewMode(mode: ViewMode): void {
    this.mediaService.setViewMode(mode);
  }

  onFolderClick(folderId: string, folderName: string): void {
    this.mediaService.setFolder(folderId, folderName);
    this.emitFilterChanged();
  }

  navigateToPath(index: number): void {
    this.mediaService.navigateToPathLevel(index);
    this.emitFilterChanged();
  }

  openNewFolderModal(): void {
    this.newFolderName.set('');
    this.showNewFolderModal.set(true);
  }

  closeNewFolderModal(): void {
    this.showNewFolderModal.set(false);
    this.newFolderName.set('');
  }

  createFolder(): void {
    const name = this.newFolderName().trim();
    if (name) {
      const parentId = this.filter().folder;
      this.folderCreated.emit({ name, parentId });
      this.closeNewFolderModal();
    }
  }

  selectItem(item: MediaItem): void {
    this.mediaService.selectItem(item);
  }

  selectAll(): void {
    const items = this.filteredItems();
    this.mediaService.selectAll(items);
  }

  deselectAll(): void {
    this.mediaService.deselectAll();
  }

  removeSelectedItem(itemId: number): void {
    this.mediaService.removeSelectedItem(itemId);
  }

  isSelected(itemId: number): boolean {
    return this.mediaService.isSelected(itemId);
  }

  onNewFolderNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newFolderName.set(input.value);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files);
      input.value = '';
    }
  }

  handleFileUpload(files: FileList): void {
    const filesArray = Array.from(files);
    this.filesUploaded.emit(filesArray);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(type: MediaType): string {
    const icons: Record<MediaType, string> = {
      image: 'bi-image',
      video: 'bi-play-circle',
      audio: 'bi-music-note',
      document: 'bi-file-text',
      archive: 'bi-file-zip',
      other: 'bi-file'
    };
    return icons[type] || 'bi-file';
  }
}
