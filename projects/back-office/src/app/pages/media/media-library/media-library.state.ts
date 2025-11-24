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

  canUpload(currentUserDocumentId?: string | null): boolean {
    const folder = this.currentFolder();
    if (!folder) return true; // Racine OK

    // Si le dossier appartient à l'utilisateur connecté, il PEUT uploader
    if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
      return true;
    }

    // Vérifier si on a hierarchy (= dans users mais pas le propriétaire)
    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    return true;
  }

  canCreateFolder(currentUserDocumentId?: string | null): boolean {
    const folder = this.currentFolder();
    if (!folder) return true;

    // Si le dossier appartient à l'utilisateur connecté, il PEUT créer
    if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
      return true;
    }

    // Vérifier si on a hierarchy (= dans users mais pas le propriétaire)
    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    return true;
  }

  isInUsersFolder = computed(() => {
    const folder = this.currentFolder();
    if (!folder) return false;

    // Vérifier par hierarchy
    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return folder.hierarchy.some(ancestor => ancestor.name === 'users');
    }

    // Vérifier par nom
    return folder.name === 'users';
  });

  canSelectItem(item: MediaFile | MediaFolder, currentUserDocumentId?: string | null): boolean {
    if (item.type === 'folder') {
      const folder = item as MediaFolder;

      // Si le dossier appartient à l'utilisateur connecté, il PEUT le sélectionner
      if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
        return true;
      }

      // Vérifier si on a hierarchy (= dans users mais pas le propriétaire)
      if (folder.hierarchy && folder.hierarchy.length > 0) {
        return false;
      }

      if (folder.name === 'users') return false;

      return true;
    }

    if (item.type === 'asset') {
      const file = item as MediaFile;

      // Si le fichier appartient à l'utilisateur connecté, il PEUT le sélectionner
      if (currentUserDocumentId && file.ownerDocumentId === currentUserDocumentId) {
        return true;
      }

      // Vérifier hierarchy du folder parent
      if (file.folder?.hierarchy && file.folder.hierarchy.length > 0) {
        return false;
      }

      if (file.folder?.name === 'users') return false;

      return true;
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
