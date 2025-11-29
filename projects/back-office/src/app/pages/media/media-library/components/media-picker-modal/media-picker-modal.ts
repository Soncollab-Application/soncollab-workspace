import { Component, inject, input, output, signal, effect, computed, OnDestroy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { takeUntil, Subject, debounceTime } from 'rxjs';
import { BreadcrumbItem, getBreadcrumbData } from '../../utils/breadcrumb.utils';
import { MediaAssetItem } from '../media-asset-item/media-asset-item';
import { MediaFolderItem } from '../media-folder-item/media-folder-item';
import { MediaService } from '../../../../../core/services/media/media.service';
import { MediaFile, MediaFolder } from '../../../../../core/models/media/media-file.model';
import { MediaLibraryState } from '../../media-library.state';
import { AuthService } from '../../../../../core/services/auth.service';
import { MediaUploadModal } from '../media-upload-modal/media-upload-modal';
import { MediaCreateFolderModal } from '../media-create-folder-modal/media-create-folder-modal';
import { MediaEditModal } from '../media-edit-modal/media-edit-modal';
import { ToastService } from 'shared-lib';
import { TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

type ActiveModal = 'picker' | 'upload' | 'createFolder' | 'edit' | null;

@Component({
  selector: 'app-media-picker-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    MediaAssetItem,
    MediaFolderItem,
    MediaUploadModal,
    MediaCreateFolderModal,
    MediaEditModal,
    FormsModule
  ],
  templateUrl: './media-picker-modal.html',
  styleUrl: './media-picker-modal.css'
})
export class MediaPickerModal implements OnDestroy {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  show = input.required<boolean>();
  acceptedTypes = input<string[]>(['image', 'video', 'audio', 'document', 'archive']);
  close = output<void>();
  fileSelected = output<MediaFile>();

  state = new MediaLibraryState();
  breadcrumbs = signal<BreadcrumbItem[]>([]);
  selectedFile = signal<MediaFile | null>(null);
  activeModal = signal<ActiveModal>(null);


  showUploadModal = signal(false);
  showCreateFolderModal = signal(false);
  showEditModal = signal(false);

  fileToEdit = signal<MediaFile | null>(null);
  folderToEdit = signal<MediaFolder | null>(null);

  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = signal(1);

  currentUserDocumentId = computed(() => {
    const user = this.authService.currentUser;
    return user?.documentId || null;
  });

  private modalInstance: any = null;
  private isInitialized = false;

  constructor() {
    effect(() => {
      const shouldShow = this.show();
      if (shouldShow) {
        if (!this.isInitialized) {
          this.state.currentFolder.set(null);
          this.selectedFile.set(null);
          this.activeModal.set('picker');
          this.setupSearch();
          this.loadData();
          this.isInitialized = true;
        }
        setTimeout(() => this.openModal(), 0);
      } else {
        this.isInitialized = false;
        this.closeModal();
      }
    });

    effect(() => {
      const currentFolder = this.state.currentFolder();
      this.updateBreadcrumbs(currentFolder);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  private setupSearch(): void {
    this.searchSubject$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(query => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadData();
      });
  }

  private openModal(): void {
    const modalElement = document.getElementById('mediaPickerModal');
    if (modalElement && !this.modalInstance) {
      this.modalInstance = new (window as any).bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      this.modalInstance.show();
    }
  }

  private closeModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
      this.modalInstance = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
  }

  private isInUsersFolder(folder?: MediaFolder | null): boolean {
    if (!folder) return false;
    if (folder.name === 'users') return true;
    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return folder.hierarchy.some(h => h.name === 'users');
    }
    return false;
  }

  private isFileTypeAccepted(mime: string): boolean {
    const accepted = this.acceptedTypes();

    for (const type of accepted) {
      switch (type) {
        case 'image':
          if (mime.startsWith('image/')) return true;
          break;
        case 'video':
          if (mime.startsWith('video/')) return true;
          break;
        case 'audio':
          if (mime.startsWith('audio/')) return true;
          break;
        case 'document':
          if (mime.includes('pdf') ||
            mime.includes('word') ||
            mime.includes('document') ||
            mime.includes('sheet') ||
            mime.includes('excel') ||
            mime.includes('presentation') ||
            mime.includes('powerpoint')) return true;
          break;
        case 'archive':
          if (mime.includes('zip') ||
            mime.includes('rar') ||
            mime.includes('7z') ||
            mime.includes('tar') ||
            mime.includes('gz')) return true;
          break;
        case 'all':
          return true;
      }
    }

    return false;
  }

  private loadData(): void {
    this.state.isLoading.set(true);
    this.state.files.set([]);
    this.state.folders.set([]);

    const currentFolder = this.state.currentFolder();
    const folderId = currentFolder?.id || null;
    const search = this.searchQuery();
    const page = this.currentPage();
    const size = this.pageSize();

    this.mediaService.getFiles(folderId, undefined, page, size, 'createdAt:DESC', search)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const filteredFiles = response.data
            .filter(f => this.isFileTypeAccepted(f.mime))
            .filter(f => !this.isInUsersFolder(f.folder))
            .map(f => ({ ...f, type: 'asset' as const, isSelectable: false }));
          this.state.files.set(filteredFiles);
          this.totalPages.set(response.meta.pagination.pageCount);
          this.state.isLoading.set(false);
        },
        error: () => {
          this.state.isLoading.set(false);
        }
      });

    if (page === 1) {
      if (currentFolder) {
        this.mediaService.getFolders(currentFolder.id, 'name:ASC', search)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const folders = response.data
                .filter(f => f.name !== 'users')
                .filter(f => !this.isInUsersFolder(f))
                .filter(f => !this.isInUsersFolder(f.parent))
                .map(f => ({
                  ...f,
                  type: 'folder' as const,
                  isSelectable: false
                }));
              this.state.folders.set(folders);
            }
          });
      } else {
        this.mediaService.getFolders(null, 'name:ASC', search)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const folders = response.data
                .filter(f => f.name !== 'users')
                .filter(f => !this.isInUsersFolder(f))
                .filter(f => !this.isInUsersFolder(f.parent))
                .map(f => ({
                  ...f,
                  type: 'folder' as const,
                  isSelectable: false
                }));
              this.state.folders.set(folders);
            }
          });
      }
    }
  }

  private updateBreadcrumbs(currentFolder: MediaFolder | null): void {
    this.breadcrumbs.set(getBreadcrumbData(currentFolder, this.currentUserDocumentId()));
  }

  onSearchInput(value: string): void {
    this.searchSubject$.next(value);
  }

  onClearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadData();
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    if (item.id === null) {
      this.state.currentFolder.set(null);
      this.selectedFile.set(null);
      this.currentPage.set(1);
      this.searchQuery.set('');
      this.loadData();
    } else if (item.folder) {
      this.loadFolderById(item.folder.documentId);
    }
  }

  onFolderClick(folder: MediaFolder): void {
    this.loadFolderById(folder.documentId);
  }

  private loadFolderById(documentId: string): void {
    this.state.isLoading.set(true);

    this.mediaService.getFolder(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.state.currentFolder.set(response.data);
          this.selectedFile.set(null);
          this.currentPage.set(1);
          this.searchQuery.set('');
          this.loadData();
        },
        error: () => {
          this.state.isLoading.set(false);
          this.toastService.showError(
            this.translate.instant('mediaLibrary.messages.folderLoadError')
          );
        }
      });
  }

  onFileClick(file: MediaFile): void {
    const current = this.selectedFile();
    if (current?.id === file.id) {
      this.selectedFile.set(null);
    } else {
      this.selectedFile.set(file);
    }
  }

  confirmSelection(): void {
    const selected = this.selectedFile();
    if (selected) {
      this.fileSelected.emit(selected);
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onOpenUpload(): void {
    this.activeModal.set('upload');
    this.showUploadModal.set(true);
  }

  onCloseUpload(): void {
    this.showUploadModal.set(false);
    this.activeModal.set('picker');
  }

  onUploadComplete(): void {
    this.loadData();
  }

  onOpenCreateFolder(): void {
    this.activeModal.set('createFolder');
    this.showCreateFolderModal.set(true);
  }

  onCloseCreateFolder(): void {
    this.showCreateFolderModal.set(false);
    this.activeModal.set('picker');
  }

  onFolderCreated(): void {
    this.loadData();
  }

  onEditFile(file: MediaFile): void {
    this.fileToEdit.set(file);
    this.folderToEdit.set(null);
    this.activeModal.set('edit');
    this.showEditModal.set(true);
  }

  onEditFolder(folder: MediaFolder): void {
    this.folderToEdit.set(folder);
    this.fileToEdit.set(null);
    this.activeModal.set('edit');
    this.showEditModal.set(true);
  }

  onCloseEdit(): void {
    this.showEditModal.set(false);
    this.fileToEdit.set(null);
    this.folderToEdit.set(null);
    this.activeModal.set('picker');
  }

  onEditComplete(): void {
    this.loadData();
  }
}
