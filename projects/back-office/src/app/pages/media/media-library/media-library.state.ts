import { computed, signal } from '@angular/core';
import {
  DEFAULT_PAGE_SIZE,
  MediaFile,
  MediaFolder,
  ViewMode,
  SortOption
} from '../../../core/models/media/media-file.model';

export class MediaLibraryState {
  files = signal<MediaFile[]>([]);
  folders = signal<MediaFolder[]>([]);
  currentFolder = signal<MediaFolder | null>(null);

  currentPage = signal<number>(1);
  pageSize = signal<number>(DEFAULT_PAGE_SIZE);
  totalItems = signal<number>(0);
  pageCount = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  currentSort = signal<SortOption>('createdAt:DESC');
  searchQuery = signal<string>('');

  viewMode = signal<ViewMode>('grid');

  selectedItems = signal<Array<MediaFile | MediaFolder>>([]);

  selectedFiles = computed(() =>
    this.selectedItems().filter(item => item.type === 'asset') as MediaFile[]
  );

  selectedFolders = computed(() =>
    this.selectedItems().filter(item => item.type === 'folder') as MediaFolder[]
  );

  hasSelection = computed(() => this.selectedItems().length > 0);

  selectedFoldersCount = computed(() => this.selectedFolders().length);
  selectedFilesCount = computed(() => this.selectedFiles().length);

  allSelected = computed(() => {
    const selectableFolders = this.folders().filter(f => this.canSelectItem(f));
    const selectableFiles = this.files().filter(f => this.canSelectItem(f));
    const total = selectableFolders.length + selectableFiles.length;
    return total > 0 && this.selectedItems().length === total;
  });

  isLoading = signal<boolean>(false);

  shouldShowFolders = computed(() => this.currentPage() === 1);
  currentFolderPath = computed(() => this.currentFolder()?.path || '/');

  canUpload(currentUserDocumentId?: string | null): boolean {
    const folder = this.currentFolder();
    if (!folder) return true;

    if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
      return true;
    }

    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    return true;
  }

  canCreateFolder(currentUserDocumentId?: string | null): boolean {
    const folder = this.currentFolder();
    if (!folder) return true;

    if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
      return true;
    }

    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    return true;
  }

  isInUsersFolder = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return false;

    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return folder.hierarchy.some(ancestor => ancestor.name === 'users');
    }

    return folder.name === 'users';
  });

  canSelectItem(item: MediaFile | MediaFolder, currentUserDocumentId?: string | null): boolean {
    if (item.type === 'folder') {
      const folder = item as MediaFolder;

      if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
        return true;
      }

      if (folder.hierarchy && folder.hierarchy.length > 0) {
        return false;
      }

      if (folder.name === 'users') return false;

      return true;
    }

    if (item.type === 'asset') {
      const file = item as MediaFile;

      if (currentUserDocumentId && file.ownerDocumentId === currentUserDocumentId) {
        return true;
      }

      if (file.folder?.hierarchy && file.folder.hierarchy.length > 0) {
        return false;
      }

      if (file.folder?.name === 'users') return false;

      return true;
    }

    return true;
  }

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
