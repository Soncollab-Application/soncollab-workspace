import { computed, signal } from '@angular/core';
import {
  DEFAULT_PAGE_SIZE,
  MediaFile,
  MediaFolder,
  ViewMode,
  SortOption
} from '../../../core/models/media/media-file.model';

export class MediaLibraryState {
  // Data
  files = signal<MediaFile[]>([]);
  folders = signal<MediaFolder[]>([]);
  currentFolder = signal<MediaFolder | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(DEFAULT_PAGE_SIZE);
  totalItems = signal<number>(0);
  pageCount = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Sort & Search
  currentSort = signal<SortOption>('createdAt:DESC');
  searchQuery = signal<string>('');

  // View
  viewMode = signal<ViewMode>('grid');

  // Selection
  selectedItems = signal<Array<MediaFile | MediaFolder>>([]);

  selectedFiles = computed(() =>
    this.selectedItems().filter(item => item.type === 'asset') as MediaFile[]
  );

  selectedFolders = computed(() =>
    this.selectedItems().filter(item => item.type === 'folder') as MediaFolder[]
  );

  hasSelection = computed(() => this.selectedItems().length > 0);

  allSelected = computed(() => {
    const total = this.files().length + this.folders().length;
    return total > 0 && this.selectedItems().length === total;
  });

  // Loading
  isLoading = signal<boolean>(false);

  // Computed
  shouldShowFolders = computed(() => this.currentPage() === 1);
  currentFolderPath = computed(() => this.currentFolder()?.path || '/');

  canUpload = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return true; // Racine = OK
    return folder.name !== 'users'; // Pas d'upload dans /users
  });

  canCreateFolder = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return true;
    return folder.name !== 'users';
  });

  // Actions
  toggleSelection(item: MediaFile | MediaFolder) {
    const selected = this.selectedItems();
    const exists = selected.find(s => s.documentId === item.documentId && s.type === item.type);

    if (exists) {
      this.selectedItems.set(selected.filter(s => !(s.documentId === item.documentId && s.type === item.type)));
    } else {
      this.selectedItems.set([...selected, item]);
    }
  }

  selectAll() {
    this.selectedItems.set([...this.folders(), ...this.files()]);
  }

  clearSelection() {
    this.selectedItems.set([]);
  }

  resetToPage1() {
    this.currentPage.set(1);
  }
}
