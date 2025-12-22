import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {MediaLibraryState} from './media-library.state';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {MediaFilterBar, MediaFilterField} from './components/media-filter-bar/media-filter-bar';
import {BreadcrumbItem, getBreadcrumbData, getEllipsisItems} from './utils/breadcrumb.utils';
import {FolderTreeNode, MediaFile, MediaFolder, SortOption} from '../../../core/models/media/media-file.model';
import {MediaService} from '../../../core/services/media/media.service';
import {ConfirmDialogService, DropdownSingleDirective, ToastService} from 'shared-lib';
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
import {AuthService} from '../../../core/services/auth.service';

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
    MediaMoveModal,
    DropdownSingleDirective
  ],
  templateUrl: './media-library.html',
  styleUrls: ['./media-library.css']
})
export class MediaLibrary implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  state = new MediaLibraryState();

  breadcrumbs = signal<BreadcrumbItem[]>([]);
  showUploadModal = signal(false);
  showCreateFolderModal = signal(false);
  showEditModal = signal(false);
  showMoveModal = signal(false);

  fileToEdit = signal<MediaFile | null>(null);
  folderToEdit = signal<MediaFolder | null>(null);

  folderStructure = signal<FolderTreeNode[]>([]);
  itemsToMove = signal<Array<MediaFile | MediaFolder>>([]);
  selectedDestination = signal<string | null>(null);

  selectedFilterField = signal<string | null>(null);
  selectedFilterOperator = signal<string | null>(null);
  selectedFilterValue = signal<string | null>(null);
  appliedFilters = signal<MediaFilterField[]>([]);

  currentUserDocumentId = computed(() => {
    const user = this.authService.currentUser;
    return user?.documentId || null;
  });

  hasSelection = computed(() => this.state.hasSelection());

  showSelectAll = computed(() => {
    const folder = this.state.currentFolder();
    if (!folder) return true;

    const userId = this.currentUserDocumentId();

    if (userId && folder.ownerDocumentId === userId) {
      return true;
    }

    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    return true;
  });

  canUpload = computed(() => this.state.canUpload(this.currentUserDocumentId()));
  canCreateFolder = computed(() => this.state.canCreateFolder(this.currentUserDocumentId()));

  canEditFile = computed(() => true);
  canEditFolder = computed(() => true);
  canDeleteFile = computed(() => true);
  canDeleteFolder = computed(() => true);

  canMoveItems = computed(() => {
    const items = this.state.selectedItems();
    return items.length > 0;
  });

  canBulkDeleteItems = computed(() => {
    const items = this.state.selectedItems();
    return items.length > 0;
  });

  constructor() {
    this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.state.searchQuery.set(query);
      this.state.resetToPage1();
      this.loadData();
    });
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(params => {
        const folderId = params['folder'] || null;
        this.navigateToFolder(folderId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canSelectItem(item: MediaFile | MediaFolder): boolean {
    return this.state.canSelectItem(item, this.currentUserDocumentId());
  }

  onTableSort(field: 'name' | 'createdAt'): void {
    const currentSort = this.state.currentSort();
    const [currentField, currentDirection] = currentSort.split(':');

    let newSort: SortOption;
    if (currentField === field) {
      newSort = currentDirection === 'ASC' ? `${field}:DESC` as SortOption : `${field}:ASC` as SortOption;
    } else {
      newSort = `${field}:ASC` as SortOption;
    }

    this.state.currentSort.set(newSort);
    this.loadData();
  }

  getSortIcon(field: 'name' | 'createdAt'): string {
    const currentSort = this.state.currentSort();
    const [currentField, currentDirection] = currentSort.split(':');

    if (currentField !== field) {
      return 'unfold_more';
    }

    return currentDirection === 'ASC' ? 'expand_less' : 'expand_more';
  }

  private navigateToFolder(folderId: string | null): void {
    if (folderId) {
      this.mediaService.getFolder(folderId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.state.currentFolder.set(response.data);
            this.updateBreadcrumbs();
            this.loadData();
          },
          error: () => {
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {}
            });
          }
        });
    } else {
      this.state.currentFolder.set(null);
      this.updateBreadcrumbs();
      this.loadData();
    }
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

    this.mediaService.getFiles(folderId, folderPath, page, pageSize, sort, search, currentParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.state.files.set(response.data.map(f => ({ ...f, type: 'asset' as const, isSelectable: true })));
          this.state.totalItems.set(response.meta.pagination.total);

          const maxPage = Math.ceil(response.meta.pagination.total / pageSize);
          if (page > 1 && page > maxPage && response.meta.pagination.total > 0) {
            this.updateQueryParams({ page: 1 });
            return;
          }

          this.state.isLoading.set(false);
        },
        error: () => {
          this.state.isLoading.set(false);
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFiles'));
        }
      });

    if (!hasAnyFilter) {
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
    } else {
      this.state.folders.set([]);
    }

    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(getBreadcrumbData(this.state.currentFolder(), this.currentUserDocumentId()));
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  private loadFolderStructure(): void {
    this.mediaService.getFolderStructure()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const structure = response.data;
          const items = this.itemsToMove();
          const itemIds = items.map(item => item.documentId);
          const currentFolderId = this.state.currentFolder()?.documentId || null;

          const filterStructure = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            return nodes
              .filter(node => !itemIds.includes(node.value || ''))
              .map(node => ({
                ...node,
                children: node.children ? filterStructure(node.children) : []
              }));
          };

          let filteredStructure = filterStructure(structure);

          if (currentFolderId) {
            filteredStructure = [
              {
                value: null,
                label: this.translate.instant('mediaLibrary.move.root'),
                children: filteredStructure
              }
            ];
            this.selectedDestination.set(null);
          } else if (filteredStructure.length > 0) {
            this.selectedDestination.set(filteredStructure[0].value);
          }

          this.folderStructure.set(filteredStructure);
        },
        error: () => {
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadStructure'));
        }
      });
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
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

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleanParams,
      queryParamsHandling: 'merge'
    });
  }

  onFolderClick(folder: MediaFolder): void {
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
      queryParamsHandling: 'merge'
    });
  }

  isSelected(item: MediaFile | MediaFolder): boolean {
    return this.state.selectedItems().some(
      selected => selected.documentId === item.documentId && selected.type === item.type
    );
  }

  onToggleSelection(item: MediaFile | MediaFolder): void {
    this.state.toggleSelection(item);
  }

  onSelectAllChange(): void {
    if (this.state.allSelected()) {
      this.state.clearSelection();
    } else {
      this.state.selectAll();
    }
  }

  onSortChange(sort: string): void {
    this.state.currentSort.set(sort as SortOption);
    this.state.resetToPage1();
    this.loadData();
  }

  onSearchChange(query: string): void {
    this.searchSubject$.next(query);
  }

  onClearSearch(): void {
    this.state.searchQuery.set('');
    this.state.resetToPage1();
    this.loadData();
  }

  onViewModeChange(mode: 'grid' | 'list'): void {
    this.state.viewMode.set(mode);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.state.pageCount()) return;
    this.state.currentPage.set(page);
    this.updateQueryParams({ page });
    this.loadData();
  }

  onFilterFieldChange(field: string): void {
    this.selectedFilterField.set(field);
    this.selectedFilterOperator.set(null);
    this.selectedFilterValue.set(null);
  }

  onFilterOperatorChange(operator: string): void {
    this.selectedFilterOperator.set(operator);
  }

  onFilterValueChange(value: string): void {
    this.selectedFilterValue.set(value);
  }

  onAddFilter(): void {
    const field = this.selectedFilterField();
    const operator = this.selectedFilterOperator();
    const value = this.selectedFilterValue();

    if (!field || !operator || !value) return;

    const newFilter: MediaFilterField = { field, operator, value };
    this.appliedFilters.set([...this.appliedFilters(), newFilter]);

    this.selectedFilterField.set(null);
    this.selectedFilterOperator.set(null);
    this.selectedFilterValue.set(null);

    this.state.resetToPage1();
    this.loadData();
  }

  onRemoveFilter(index: number): void {
    const filters = [...this.appliedFilters()];
    filters.splice(index, 1);
    this.appliedFilters.set(filters);
    this.state.resetToPage1();
    this.loadData();
  }

  onClearFilters(): void {
    this.appliedFilters.set([]);
    this.state.resetToPage1();
    this.loadData();
  }

  onOpenUpload(): void {
    this.showUploadModal.set(true);
  }

  onCloseUpload(): void {
    this.showUploadModal.set(false);
  }

  onUploadComplete(): void {
    this.loadData();
  }

  onOpenCreateFolder(): void {
    this.showCreateFolderModal.set(true);
  }

  onCloseCreateFolder(): void {
    this.showCreateFolderModal.set(false);
  }

  onFolderCreated(): void {
    this.loadData();
  }

  onEditFile(file: MediaFile): void {
    this.fileToEdit.set(file);
    this.folderToEdit.set(null);
    this.showEditModal.set(true);
  }

  onEditFolder(folder: MediaFolder): void {
    this.folderToEdit.set(folder);
    this.fileToEdit.set(null);
    this.showEditModal.set(true);
  }

  onCloseEdit(): void {
    this.showEditModal.set(false);
    this.fileToEdit.set(null);
    this.folderToEdit.set(null);
  }

  onEditComplete(): void {
    this.loadData();
  }

  onMoveItem(item: MediaFile | MediaFolder): void {
    this.itemsToMove.set([item]);
    this.selectedDestination.set(null);
    this.loadFolderStructure();
    this.showMoveModal.set(true);
  }

  onMoveBulk(): void {
    this.itemsToMove.set(this.state.selectedItems());
    this.selectedDestination.set(null);
    this.loadFolderStructure();
    this.showMoveModal.set(true);
  }

  onCloseMoveModal(): void {
    this.showMoveModal.set(false);
    this.itemsToMove.set([]);
    this.selectedDestination.set(null);
  }

  onMoveComplete(): void {
    this.state.clearSelection();
    this.loadData();
  }

  onDestinationChange(destination: string | null): void {
    this.selectedDestination.set(destination);
  }

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

  onDownloadFile(file: MediaFile): void {
    const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;
    window.open(url, '_blank');
  }

  onCopyLink(file: MediaFile): void {
    const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.showSuccess(
        this.translate.instant('mediaLibrary.success.linkCopied')
      );
    });
  }

  getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    return 'insert_drive_file';
  }

  getFileIconClass(file: MediaFile): string {
    if (file.mime.startsWith('image/')) return 'text-success';
    if (file.mime.startsWith('video/')) return 'text-danger';
    if (file.mime.startsWith('audio/')) return 'text-info';
    if (file.mime.includes('pdf')) return 'text-warning';
    return 'text-secondary';
  }

  getTypeBadge(file: MediaFile): string {
    const mime = file.mime;
    if (mime.startsWith('image/')) return 'IMG';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('document')) return 'DOC';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLS';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT';
    return 'FILE';
  }

  getTypeBadgeClass(file: MediaFile): string {
    if (file.mime.startsWith('image/')) return 'bg-success';
    if (file.mime.startsWith('video/')) return 'bg-danger';
    if (file.mime.startsWith('audio/')) return 'bg-info';
    if (file.mime.includes('pdf')) return 'bg-warning';
    return 'bg-secondary';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
