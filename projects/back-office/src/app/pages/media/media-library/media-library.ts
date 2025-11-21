import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {MediaLibraryState} from './media-library.state';
import {distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {MediaFilterBar, MediaFilterField} from './components/media-filter-bar/media-filter-bar';
import {BreadcrumbItem, getBreadcrumbData} from './utils/breadcrumb.utils';
import {FolderTreeNode, MediaFile, MediaFolder, SortOption} from '../../../core/models/media/media-file.model';
import {MediaService} from '../../../core/services/media/media.service';
import {ConfirmDialogService, ToastService} from 'shared-lib';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {ActivatedRoute, Router} from '@angular/router';
import {environment} from '../../../../environments/environment';
import {MediaCreateFolderModal} from './components/media-create-folder-modal/media-create-folder-modal';
import {MediaEditModal} from './components/media-edit-modal/media-edit-modal';
import {MediaMoveModal} from './components/media-move-modal/media-move-modal';
import {MediaUploadModal} from './components/media-upload-modal/media-upload-modal';
import {MediaAssetItem} from './components/media-asset-item/media-asset-item';
import {MediaFolderItem} from './components/media-folder-item/media-folder-item';
import {CommonModule} from '@angular/common';


@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MediaFilterBar,
    MediaFolderItem,
    MediaAssetItem,
    MediaUploadModal,
    MediaCreateFolderModal,
    MediaEditModal,
    MediaMoveModal
  ],
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
  showEditFolderModal = signal(false);
  showMoveModal = signal(false);

  fileToEdit = signal<MediaFile | null>(null);
  folderToEdit = signal<MediaFolder | null>(null);

  // Move functionality
  folderStructure = signal<FolderTreeNode[]>([]);
  selectedDestinationFolder = signal<string | null>(null);
  filesToMove = signal<Array<MediaFile | MediaFolder>>([]);

  // Filters
  selectedFilterField = signal<string | null>(null);
  selectedFilterOperator = signal<string | null>(null);
  selectedFilterValue = signal<string | null>(null);
  appliedFilters = signal<MediaFilterField[]>([]);

  // Breadcrumb
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  // Computed
  hasSelection = computed(() =>
    this.state.selectedItems().length > 0 &&
    this.state.selectedItems().length < (this.state.folders().length + this.state.files().length)
  );

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => this.handleRouteChange(params));

    this.searchSubject$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => this.executeSearch(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleRouteChange(params: any): void {
    const folderId = params['folder'] || null;

    this.state.currentPage.set(parseInt(params['page']) || 1);
    this.state.pageSize.set(parseInt(params['pageSize']) || 10);
    this.state.currentSort.set(params['sort'] || 'createdAt:DESC');
    this.state.searchQuery.set(params['_q'] || '');

    this.restoreFiltersFromQuery(params);

    if (folderId) {
      this.loadFolderById(folderId);
    } else {
      this.state.currentFolder.set(null);
      this.loadData();
    }
  }

  private restoreFiltersFromQuery(params: any): void {
    const filters: MediaFilterField[] = [];

    Object.keys(params).forEach(key => {
      const match = key.match(/filters\[\$and\]\[(\d+)\]\[(\w+)\]\[(\$\w+)\]/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];
        const operator = match[3];
        const value = params[key];

        while (filters.length <= index) {
          filters.push(null as any);
        }

        filters[index] = { field, operator, value };
      }
    });

    const validFilters = filters.filter(f => f !== null && f !== undefined);
    this.appliedFilters.set(validFilters);
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }


  private loadFolderById(documentId: string): void {
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

  private loadData(): void {
    this.state.isLoading.set(true);
    this.state.files.set([]);
    this.state.folders.set([]);
    this.state.clearSelection();

    const currentFolder = this.state.currentFolder();
    const folderId = currentFolder?.id || null;
    const page = this.state.currentPage();
    const pageSize = this.state.pageSize();
    const sort = this.state.currentSort();
    const search = this.state.searchQuery();
    const folderPath = search ? undefined : (currentFolder?.path || undefined);
    const currentParams = this.route.snapshot.queryParams;
    const hasAnyFilter = this.appliedFilters().length > 0;

    // Load files
    this.mediaService.getFiles(folderId, folderPath, page, pageSize, sort, search, currentParams)
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

    // Load folders (page 1 TOUJOURS et sans filtres)
    if (this.state.currentPage() === 1 && !hasAnyFilter) {
      this.mediaService.getFolders(folderId, sort, search, currentParams)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.state.folders.set(response.data.map(f => ({ ...f, type: 'folder' as const, isSelectable: true })));
          },
          error: () => {
            this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFolders'));
          }
        });
    }

    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(getBreadcrumbData(this.state.currentFolder()));
  }

  // ==================== NAVIGATION ====================

  onFolderClick(folder: MediaFolder): void {
    this.state.isLoading.set(true);
    this.state.searchQuery.set('');
    this.appliedFilters.set([]);

    const currentParams = this.route.snapshot.queryParams;
    const cleanParams: any = {
      folder: folder.documentId,
      page: 1,
      _q: undefined
    };

    Object.keys(currentParams).forEach(key => {
      if (key.startsWith('filters[$and]')) {
        cleanParams[key] = undefined;
      }
    });

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleanParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    this.state.isLoading.set(true);
    this.state.searchQuery.set('');
    this.appliedFilters.set([]);

    const currentParams = this.route.snapshot.queryParams;
    const cleanParams: any = {
      folder: item.id === null ? undefined : item.folder?.documentId,
      page: 1,
      _q: undefined
    };

    Object.keys(currentParams).forEach(key => {
      if (key.startsWith('filters[$and]')) {
        cleanParams[key] = undefined;
      }
    });

    this.updateQueryParams(cleanParams);
  }

  onSortChange(sort: string): void {
    this.state.currentSort.set(sort as SortOption);
    this.updateQueryParams({ sort, page: 1 });
  }

  onSearchChange(searchTerm: string): void {
    this.searchSubject$.next(searchTerm);
  }

  onClearSearch(): void {
    this.state.searchQuery.set('');
    this.searchSubject$.next('');
  }

  private executeSearch(query: string): void {
    this.updateQueryParams({ _q: query || undefined, page: 1 });
  }

  onViewModeChange(mode: 'grid' | 'list'): void {
    this.state.viewMode.set(mode);
  }

  onSelectAllChange(): void {
    if (this.state.allSelected()) {
      this.state.clearSelection();
    } else {
      this.state.selectAll();
    }
  }


  onFilterFieldChange(field: string): void {
    this.selectedFilterField.set(field);
    this.selectedFilterOperator.set(null);
    this.selectedFilterValue.set(null);
  }

  onFilterOperatorChange(operator: string): void {
    this.selectedFilterOperator.set(operator);
    this.selectedFilterValue.set(null);
  }

  onFilterValueChange(value: string): void {
    this.selectedFilterValue.set(value);
  }

  onAddFilter(): void {
    const field = this.selectedFilterField();
    const operator = this.selectedFilterOperator();
    const value = this.selectedFilterValue();

    if (!field || !operator || !value) return;

    const isDuplicate = this.appliedFilters().some(filter =>
      filter.field === field &&
      filter.operator === operator &&
      filter.value === value
    );

    if (isDuplicate) {
      this.toastService.showWarning(
        this.translate.instant('mediaLibrary.filters.alreadyApplied')
      );
      return;
    }

    this.appliedFilters.update(filters => [
      ...filters,
      { field, operator, value }
    ]);

    this.selectedFilterField.set(null);
    this.selectedFilterOperator.set(null);
    this.selectedFilterValue.set(null);

    this.applyFiltersToQuery();
  }

  onRemoveFilter(index: number): void {
    this.appliedFilters.update(filters =>
      filters.filter((_, i) => i !== index)
    );
    this.applyFiltersToQuery();
  }

  onClearFilters(): void {
    this.appliedFilters.set([]);
    this.applyFiltersToQuery();
  }

  private applyFiltersToQuery(): void {
    const filters = this.appliedFilters();

    const currentParams = this.route.snapshot.queryParams;
    const cleanParams: any = { page: 1 };

    Object.keys(currentParams).forEach(key => {
      if (key.startsWith('filters[$and]')) {
        cleanParams[key] = undefined;
      }
    });

    if (filters.length > 0) {
      filters.forEach((filter, index) => {
        const key = `filters[$and][${index}][${filter.field}][${filter.operator}]`;
        cleanParams[key] = filter.value;
      });
    }

    this.updateQueryParams(cleanParams);
  }


  isSelected(item: MediaFile | MediaFolder): boolean {
    return this.state.selectedItems().some(
      selected => selected.documentId === item.documentId && selected.type === item.type
    );
  }

  onToggleSelection(item: MediaFile | MediaFolder): void {
    this.state.toggleSelection(item);
  }


  // Upload
  onOpenUpload(): void {
    if (!this.state.canUpload()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.cannotUploadHere'));
      return;
    }
    this.showUploadModal.set(true);
  }

  onCloseUpload(): void {
    this.showUploadModal.set(false);
  }

  onUploadComplete(): void {
    this.loadData();
  }

  // Create Folder
  onOpenCreateFolder(): void {
    if (!this.state.canCreateFolder()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.cannotCreateFolderHere'));
      return;
    }
    this.showCreateFolderModal.set(true);
  }

  onCloseCreateFolder(): void {
    this.showCreateFolderModal.set(false);
  }

  onFolderCreated(): void {
    this.loadData();
  }

  // Edit
  onEditFile(file: MediaFile): void {
    this.fileToEdit.set(file);
    this.showEditFileModal.set(true);
  }

  onEditFolder(folder: MediaFolder): void {
    this.folderToEdit.set(folder);
    this.showEditFolderModal.set(true);
  }

  onCloseEdit(): void {
    this.showEditFileModal.set(false);
    this.showEditFolderModal.set(false);
    this.fileToEdit.set(null);
    this.folderToEdit.set(null);
  }

  onEditComplete(): void {
    this.loadData();
  }

  // Move
  onMoveItem(item: MediaFile | MediaFolder): void {
    this.filesToMove.set([item]);
    this.loadFolderStructureAndOpenModal();
  }

  onMoveBulk(): void {
    this.filesToMove.set(this.state.selectedItems());
    this.loadFolderStructureAndOpenModal();
  }

  private loadFolderStructureAndOpenModal(): void {
    const itemsToMove = this.filesToMove();
    const folderIdsToMove = itemsToMove
      .filter(i => i.type === 'folder')
      .map(i => i.documentId);

    this.mediaService.getFolderStructure()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const filteredStructure = this.filterInvalidDestinations(
            response.data,
            folderIdsToMove,
            this.state.currentFolder()?.documentId
          );

          const currentFolder = this.state.currentFolder();
          const structure: FolderTreeNode[] = [];

          if (currentFolder !== null) {
            structure.push({
              value: null,
              label: this.translate.instant('mediaLibrary.move.root'),
              children: filteredStructure
            });
            this.selectedDestinationFolder.set(null);
          } else {
            structure.push(...filteredStructure);
            if (filteredStructure.length > 0) {
              this.selectedDestinationFolder.set(filteredStructure[0].value);
            }
          }

          this.folderStructure.set(structure);
          this.showMoveModal.set(true);
        },
        error: () => {
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadStructure'));
        }
      });
  }

  private filterInvalidDestinations(
    nodes: FolderTreeNode[],
    folderIdsToMove: string[],
    currentFolderId?: string
  ): FolderTreeNode[] {
    return nodes
      .filter(node =>
        node.value !== currentFolderId &&
        !folderIdsToMove.includes(node.value!)
      )
      .map(node => ({
        ...node,
        children: node.children
          ? this.filterInvalidDestinations(node.children, folderIdsToMove, currentFolderId)
          : undefined
      }));
  }

  onCloseMove(): void {
    this.showMoveModal.set(false);
    this.filesToMove.set([]);
  }

  onMoveComplete(): void {
    this.state.clearSelection();
    this.loadData();
  }

  onDestinationChange(destination: string | null): void {
    this.selectedDestinationFolder.set(destination);
  }

  // Delete
  async onDeleteFile(file: MediaFile): Promise<void> {
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

  async onDeleteFolder(folder: MediaFolder): Promise<void> {
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

  async onBulkDelete(): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: this.translate.instant('mediaLibrary.confirm.bulkDelete.title'),
      message: this.translate.instant('mediaLibrary.confirm.bulkDelete.message', {
        count: this.state.selectedItems().length
      }),
      confirmText: this.translate.instant('common.delete'),
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    });

    if (!confirmed) return;

    const items = this.state.selectedItems();
    const fileIds = items.filter(item => item.type === 'asset').map(item => item.documentId);
    const folderIds = items.filter(item => item.type === 'folder').map(item => item.documentId);

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

  // Download & Copy
  onDownloadFile(file: MediaFile): void {
    const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;
    window.open(url, '_blank');
  }

  onCopyLink(file: MediaFile): void {
    const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.showSuccess(this.translate.instant('mediaLibrary.success.linkCopied'));
    });
  }


  onPageChange(page: number): void {
    this.updateQueryParams({ page });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  }

  getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'folder_zip';
    return 'insert_drive_file';
  }

  getFileIconClass(file: MediaFile): string {
    const mime = file.mime;
    if (mime.startsWith('image/')) return 'text-success';
    if (mime.startsWith('video/')) return 'text-danger';
    if (mime.startsWith('audio/')) return 'text-info';
    if (mime.includes('pdf')) return 'text-danger';
    if (mime.includes('word') || mime.includes('document')) return 'text-primary';
    if (mime.includes('sheet') || mime.includes('excel')) return 'text-success';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'text-warning';
    return 'text-secondary';
  }

  getTypeBadge(file: MediaFile): string {
    return file.ext.toUpperCase();
  }

  getTypeBadgeClass(file: MediaFile): string {
    const mime = file.mime;
    if (mime.startsWith('image/')) return 'text-success bg-success-subtle';
    if (mime.startsWith('video/')) return 'text-danger bg-danger-subtle';
    if (mime.startsWith('audio/')) return 'text-info bg-info-subtle';
    if (mime.includes('pdf')) return 'text-danger bg-danger-subtle';
    if (mime.includes('word') || mime.includes('document')) return 'text-primary bg-primary-subtle';
    if (mime.includes('sheet') || mime.includes('excel')) return 'text-success bg-success-subtle';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'text-warning bg-warning-subtle';
    return 'text-warning bg-warning-subtle';
  }

  canSelectItem(item: MediaFile | MediaFolder): boolean {
    return this.state.canSelectItem(item);
  }

}
