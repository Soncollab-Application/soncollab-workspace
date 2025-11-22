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

  // Compte les folders et assets séparément
  selectedFoldersCount = computed(() => this.selectedFolders().length);
  selectedFilesCount = computed(() => this.selectedFiles().length);

  allSelected = computed(() => {
    const selectableFolders = this.folders().filter(f => this.canSelectItem(f));
    const selectableFiles = this.files().filter(f => this.canSelectItem(f));
    const total = selectableFolders.length + selectableFiles.length;
    return total > 0 && this.selectedItems().length === total;
  });

  // Loading
  isLoading = signal<boolean>(false);

  // Computed
  shouldShowFolders = computed(() => this.currentPage() === 1);
  currentFolderPath = computed(() => this.currentFolder()?.path || '/');

  canUpload = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return true;
    return folder.name !== 'users';
  });

  canCreateFolder = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return true;
    return folder.name !== 'users';
  });

  isInUsersFolder = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return false;

    let current: MediaFolder | null | undefined = folder;
    while (current) {
      if (current.name === 'users') return true;
      current = current.parent;
    }

    return false;
  });

  canSelectItem(item: MediaFile | MediaFolder): boolean {
    // Si c'est le dossier users lui-même
    if (item.type === 'folder' && item.name === 'users') return false;

    // Si on est dans le dossier users
    if (this.isInUsersFolder()) return false;

    // Pour les folders, vérifier si c'est un enfant de users
    if (item.type === 'folder') {
      let current: MediaFolder | null | undefined = (item as MediaFolder).parent;
      while (current) {
        if (current.name === 'users') return false;
        current = current.parent;
      }
    }

    // Pour les fichiers, vérifier si leur dossier parent est dans users
    if (item.type === 'asset') {
      let current: MediaFolder | null | undefined = (item as MediaFile).folder;
      while (current) {
        if (current.name === 'users') return false;
        current = current.parent;
      }
    }

    return true;
  }

  // Actions
  toggleSelection(item: MediaFile | MediaFolder) {
    if (!this.canSelectItem(item)) return;
    const selected = this.selectedItems();
    const exists = selected.find(s => s.documentId === item.documentId && s.type === item.type);

    if (exists) {
      this.selectedItems.set(selected.filter(s => !(s.documentId === item.documentId && s.type === item.type)));
    } else {
      this.selectedItems.set([...selected, item]);
    }
  }

  selectAll() {
    const selectableFolders = this.folders().filter(f => this.canSelectItem(f));
    const selectableFiles = this.files().filter(f => this.canSelectItem(f));
    this.selectedItems.set([...selectableFolders, ...selectableFiles]);
  }

  clearSelection() {
    this.selectedItems.set([]);
  }

  resetToPage1() {
    this.currentPage.set(1);
  }
}
