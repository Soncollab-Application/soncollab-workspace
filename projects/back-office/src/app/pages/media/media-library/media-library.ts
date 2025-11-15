// projects/back-office/src/app/pages/media/media-library/media-library.ts

import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, distinctUntilChanged } from 'rxjs';

// Services
import { MediaService } from '../../../core/services/media/media.service';
import { ToastService, ConfirmDialogService } from 'shared-lib';

// State
import { MediaLibraryState } from './media-library.state';

// Models
import {FolderTreeNode, MediaFile, MediaFolder, SortOption} from '../../../core/models/media/media-file.model';

// Utils
import { getBreadcrumbData, BreadcrumbItem } from './utils/breadcrumb.utils';

// Environment
import { environment } from '../../../../environments/environment';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './media-library.html',
  styleUrls: ['./media-library.css']
})
export class MediaLibrary implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Services
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private translate = inject(TranslateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  state = new MediaLibraryState();

  // UI State
  showUploadModal = signal(false);
  showCreateFolderModal = signal(false);
  showEditFileModal = signal(false);
  showMoveModal = signal(false);
  fileToEdit = signal<MediaFile | null>(null);
  newFolderName = signal('');
  uploadingFiles = signal<File[]>([]);

  // Move functionality
  availableFolders = signal<MediaFolder[]>([]);
  selectedDestinationFolder = signal<string | null>(null);
  filesToMove = signal<Array<MediaFile | MediaFolder>>([]);

  folderStructure = signal<FolderTreeNode[]>([]);
  showEditFolderModal = signal(false);
  folderToEdit = signal<MediaFolder | null>(null);
  newFolderNameEdit = signal('');

  // Breadcrumb
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  ngOnInit() {
    // Query params subscription
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.handleRouteChange(params);
    });

    // Recherche uniquement sur Enter ou clear
    this.searchSubject$.pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.executeSearch(query);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== QUERY PARAMS ====================

  private handleRouteChange(params: any) {
    const folderId = params['folder'] || null;
    this.state.currentPage.set(parseInt(params['page']) || 1);
    this.state.pageSize.set(parseInt(params['pageSize']) || 10);
    this.state.currentSort.set(params['sort'] || 'createdAt:DESC');
    this.state.searchQuery.set(params['_q'] || '');
    if (folderId) {
      this.loadFolderById(folderId);
    } else {
      this.state.currentFolder.set(null);
      this.loadData();
    }
  }

  private updateQueryParams(params: Record<string, any>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  // ==================== DATA LOADING ====================

  private loadFolderById(documentId: string) {
    this.mediaService.getFolder(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.state.currentFolder.set(response.data);
          this.loadData();
        },
        error: () => {
          this.state.currentFolder.set(null);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { folder: null },
            queryParamsHandling: 'merge'
          });
          this.loadData();
        }
      });
  }

  private loadData() {
    this.state.isLoading.set(true);
    this.state.clearSelection();

    const currentFolder = this.state.currentFolder();
    const folderId = currentFolder?.id || null;
    const page = this.state.currentPage();
    const pageSize = this.state.pageSize();
    const sort = this.state.currentSort();
    const search = this.state.searchQuery();

    const folderPath = search ? undefined : (currentFolder?.path || '/');

    // Load files
    this.mediaService.getFiles(folderId, folderPath, page, pageSize, sort, search)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.state.files.set(response.data.map(f => ({ ...f, type: 'asset' as const, isSelectable: true })));
          this.state.totalItems.set(response.meta.pagination.total);
          this.state.isLoading.set(false);
        },
        error: () => {
          this.state.isLoading.set(false);
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFiles'));
        }
      });

    // Load folders (page 1 TOUJOURS)
    if (this.state.currentPage() === 1) {
      this.mediaService.getFolders(folderId, sort, search)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.state.folders.set(response.data.map(f => ({ ...f, type: 'folder' as const, isSelectable: true })));
          },
          error: () => {
            this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFolders'));
          }
        });
    } else {
      this.state.folders.set([]);
    }

    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs() {
    this.breadcrumbs.set(getBreadcrumbData(this.state.currentFolder()));
  }

  // ==================== NAVIGATION ====================

  onFolderClick(folder: MediaFolder) {
    this.state.searchQuery.set('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        folder: folder.documentId,
        page: 1,
        _q: undefined
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onBreadcrumbClick(item: BreadcrumbItem) {
    this.state.searchQuery.set('');
    if (item.id === null) {
      this.updateQueryParams({
        folder: null,
        page: 1,
        _q: undefined
      });
    } else {
      this.updateQueryParams({
        folder: item.folder?.documentId,
        page: 1,
        _q: undefined
      });
    }
  }

  // ==================== VIEW MODE ====================

  toggleViewMode() {
    const newMode = this.state.viewMode() === 'grid' ? 'list' : 'grid';
    this.state.viewMode.set(newMode);
  }

  // ==================== SELECTION ====================

  onToggleSelection(item: MediaFile | MediaFolder) {
    this.state.toggleSelection(item);
  }

  onSelectAll() {
    if (this.state.allSelected()) {
      this.state.clearSelection();
    } else {
      this.state.selectAll();
    }
  }

  isSelected(item: MediaFile | MediaFolder): boolean {
    return this.state.selectedItems().some(
      s => s.documentId === item.documentId && s.type === item.type
    );
  }

  // ==================== SEARCH ====================

  onSearchEnter() {
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    const query = input?.value || '';
    this.searchSubject$.next(query);
  }

  private executeSearch(query: string) {
    this.state.searchQuery.set(query);
    this.state.resetToPage1();
    this.updateQueryParams({ _q: query || undefined, page: 1 });
  }

  clearSearch() {
    this.state.searchQuery.set('');
    this.searchSubject$.next('');
  }

  // ==================== SORT ====================

  onSortChange(sort: SortOption) {
    this.state.currentSort.set(sort);
    this.updateQueryParams({ sort });
  }

  // ==================== UPLOAD ====================

  openUploadDialog() {
    if (!this.state.canUpload()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.cannotUploadHere'));
      return;
    }
    this.showUploadModal.set(true);
  }

  closeUploadDialog() {
    this.showUploadModal.set(false);
    this.uploadingFiles.set([]);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.uploadingFiles.set(Array.from(input.files));
    }
  }

  uploadFiles() {
    const files = this.uploadingFiles();
    if (files.length === 0) return;

    const folderId = this.state.currentFolder()?.documentId;

    this.mediaService.uploadFiles(files, folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.filesUploaded', { count: files.length })
          );
          this.closeUploadDialog();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.uploadFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== CREATE FOLDER ====================

  openCreateFolderDialog() {
    if (!this.state.canCreateFolder()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.cannotCreateFolderHere'));
      return;
    }
    this.newFolderName.set('');
    this.showCreateFolderModal.set(true);
  }

  closeCreateFolderDialog() {
    this.showCreateFolderModal.set(false);
    this.newFolderName.set('');
  }

  createFolder() {
    const name = this.newFolderName().trim();
    if (!name) return;

    const parentId = this.state.currentFolder()?.documentId;

    this.mediaService.createFolder({ name, parentId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.folderCreated', { name })
          );
          this.closeCreateFolderDialog();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.createFolderFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== EDIT FILE ====================

  openEditFileDialog(file: MediaFile) {
    this.fileToEdit.set(file);
    this.showEditFileModal.set(true);
  }

  closeEditFileDialog() {
    this.showEditFileModal.set(false);
    this.fileToEdit.set(null);
  }

  updateFile(data: { name?: string; alternativeText?: string; caption?: string }) {
    const file = this.fileToEdit();
    if (!file) return;

    this.mediaService.updateFile(file.documentId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.fileUpdated')
          );
          this.closeEditFileDialog();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.updateFileFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== MOVE ====================

  moveItem(item: MediaFile | MediaFolder) {
    this.filesToMove.set([item]);
    this.openMoveDialog();
  }

  openMoveDialog(item?: MediaFile | MediaFolder) {
    if (item) {
      this.filesToMove.set([item]);
    }

    this.mediaService.getFolderStructure()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Ajouter la racine
          this.folderStructure.set([
            {
              value: null,
              label: this.translate.instant('mediaLibrary.move.root'),
              children: response.data
            }
          ]);
          this.showMoveModal.set(true);
        },
        error: () => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.loadStructure')
          );
        }
      });
  }

  flattenFolderStructure(nodes: FolderTreeNode[], level = 0): Array<{ value: string | null; label: string; level: number }> {
    const result: Array<{ value: string | null; label: string; level: number }> = [];

    for (const node of nodes) {
      result.push({
        value: node.value,
        label: node.label,
        level
      });

      if (node.children && node.children.length > 0) {
        result.push(...this.flattenFolderStructure(node.children, level + 1));
      }
    }

    return result;
  }

  editFolder(folder: MediaFolder) {
    this.folderToEdit.set(folder);
    this.newFolderNameEdit.set(folder.name);
    this.showEditFolderModal.set(true);
  }

  closeEditFolderDialog() {
    this.showEditFolderModal.set(false);
    this.folderToEdit.set(null);
    this.newFolderNameEdit.set('');
  }

  updateFolderName() {
    const folder = this.folderToEdit();
    const newName = this.newFolderNameEdit().trim();

    if (!folder || !newName) return;

    this.mediaService.updateFolder(folder.documentId, { name: newName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.folderUpdated', { name: newName })
          );
          this.closeEditFolderDialog();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.updateFolderFailed', { message: error.error?.error || error.message })
          );
        }
      });
  }

  closeMoveDialog() {
    this.showMoveModal.set(false);
    this.selectedDestinationFolder.set(null);
    this.filesToMove.set([]);
  }

  selectDestinationFolder(folderId: string | null) {
    this.selectedDestinationFolder.set(folderId);
  }

  private loadAvailableFolders() {
    const selectedFolderIds = this.state.selectedFolders().map(f => f.documentId);
    const itemsToMoveIds = this.filesToMove()
      .filter(item => item.type === 'folder')
      .map(item => item.documentId);

    const excludedFolderIds = [...selectedFolderIds, ...itemsToMoveIds];

    this.mediaService.getFolders(null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const availableFolders = response.data.filter(
            folder => !excludedFolderIds.includes(folder.documentId)
          );
          this.availableFolders.set(availableFolders);
        },
        error: () => {
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFolders'));
        }
      });
  }

  confirmMove() {
    const destinationFolderId = this.selectedDestinationFolder();

    const items = this.filesToMove().length > 0
      ? this.filesToMove()
      : this.state.selectedItems();

    const fileIds = items
      .filter(item => item.type === 'asset')
      .map(item => item.documentId);

    const folderIds = items
      .filter(item => item.type === 'folder')
      .map(item => item.documentId);

    if (fileIds.length === 0 && folderIds.length === 0) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.nothingToMove'));
      return;
    }

    this.mediaService.bulkMove({
      fileIds,
      folderIds,
      destinationFolderId: destinationFolderId || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const successCount = response.data.success.length;
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.itemsMoved', { count: successCount })
          );
          this.closeMoveDialog();
          this.state.clearSelection();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.moveFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== DELETE ====================

  async deleteFile(file: MediaFile) {
    const confirmed = await this.confirmDialog.confirmDelete(file.name);
    if (!confirmed) return;

    this.mediaService.deleteFile(file.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.fileDeleted', { name: file.name })
          );
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.deleteFileFailed', { message: error.message })
          );
        }
      });
  }

  async deleteFolder(folder: MediaFolder) {
    const confirmed = await this.confirmDialog.confirmDelete(folder.name);
    if (!confirmed) return;

    this.mediaService.deleteFolder(folder.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.folderDeleted', { name: folder.name })
          );
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.deleteFolderFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== BULK DELETE ====================

  async bulkDelete() {
    const fileIds = this.state.selectedFiles().map(f => f.documentId);
    const folderIds = this.state.selectedFolders().map(f => f.documentId);
    const total = fileIds.length + folderIds.length;

    const confirmed = await this.confirmDialog.open({
      title: this.translate.instant('mediaLibrary.bulkDelete.title'),
      message: this.translate.instant('mediaLibrary.bulkDelete.message', { count: total }),
      confirmText: this.translate.instant('mediaLibrary.bulkDelete.confirm'),
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    });

    if (!confirmed) return;

    this.mediaService.bulkDelete({ fileIds, folderIds })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const successCount = response.data.files.success.length + response.data.folders.success.length;
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.bulkDeleted', { count: successCount })
          );
          this.state.clearSelection();
          this.loadData();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.bulkDeleteFailed', { message: error.message })
          );
        }
      });
  }

  // ==================== PAGINATION ====================

  onPageChange(page: number) {
    this.updateQueryParams({ page });
  }

  onPageSizeChange(pageSize: number) {
    this.updateQueryParams({ pageSize, page: 1 });
  }

  // ==================== HELPERS ====================

  getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  }

  getThumbnail(file: MediaFile): string {
    return file.formats?.thumbnail?.url || file.url;
  }

  getFileUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return environment.api.baseUrl + url;
  }

  downloadFile(file: MediaFile) {
    window.open(this.getFileUrl(file.url), '_blank');
  }

  copyLink(file: MediaFile) {
    const fullUrl = this.getFileUrl(file.url);
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.toastService.showSuccess(this.translate.instant('mediaLibrary.success.linkCopied'));
    });
  }
}
