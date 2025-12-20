import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {MediaLibraryState} from './media-library.state';
import {distinctUntilChanged, forkJoin, Subject, takeUntil} from 'rxjs';
import {MediaFilterBar, MediaFilterField} from './components/media-filter-bar/media-filter-bar';
import {BreadcrumbItem, getBreadcrumbData, getEllipsisItems} from './utils/breadcrumb.utils';
import {FolderTreeNode, MediaFile, MediaFolder, SortOption} from '../../../core/models/media/media-file.model';
import {MediaService} from '../../../core/services/media/media.service';
import {ConfirmDialogService, DropdownSingleDirective, ToastService, PermissionService} from 'shared-lib';
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  state = new MediaLibraryState();

  showUploadModal = signal(false);
  showCreateFolderModal = signal(false);
  showEditFileModal = signal(false);
  showEditFolderModal = signal(false);
  showMoveModal = signal(false);

  fileToEdit = signal<MediaFile | null>(null);
  folderToEdit = signal<MediaFolder | null>(null);

  folderStructure = signal<FolderTreeNode[]>([]);
  selectedDestinationFolder = signal<string | null>(null);
  filesToMove = signal<Array<MediaFile | MediaFolder>>([]);

  selectedFilterField = signal<string | null>(null);
  selectedFilterOperator = signal<string | null>(null);
  selectedFilterValue = signal<string | null>(null);
  appliedFilters = signal<MediaFilterField[]>([]);

  // Permissions API
  hasPermissionFind = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'find')
  );

  hasPermissionUpload = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'upload')
  );

  hasPermissionUpdate = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'update')
  );

  hasPermissionDelete = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'delete')
  );

  hasPermissionCreateFolder = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'createFolder')
  );

  hasPermissionDeleteFolder = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'deleteFolder')
  );

  hasPermissionBulkDelete = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'bulkDelete')
  );

  hasPermissionBulkMove = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'bulkMove')
  );

  hasPermissionUpdateFolder = computed(() =>
    this.permissionService.hasPermission('media-library', 'media-library', 'updateFolder')
  );

  // Computed - Logique métier
  currentUserDocumentId = computed(() => {
    const user = this.authService.currentUser;
    return user?.documentId || null;
  });

  breadcrumbs = computed(() =>
    getBreadcrumbData(this.state.currentFolder(), this.currentUserDocumentId())
  );

  ellipsisItems = computed(() =>
    getEllipsisItems(this.state.currentFolder(), this.currentUserDocumentId())
  );

  hasSelection = computed(() =>
    this.state.selectedItems().length > 0 &&
    this.state.selectedItems().length < (this.state.folders().length + this.state.files().length)
  );

  canUpload = computed(() =>
    this.hasPermissionUpload() && this.state.canUpload(this.currentUserDocumentId())
  );

  canCreateFolder = computed(() =>
    this.hasPermissionCreateFolder() && this.state.canCreateFolder(this.currentUserDocumentId())
  );

  canEditFile = computed(() => this.hasPermissionUpdate());
  canEditFolder = computed(() => this.hasPermissionUpdateFolder());
  canDeleteFile = computed(() => this.hasPermissionDelete());
  canDeleteFolder = computed(() => this.hasPermissionDeleteFolder());
  canMoveItems = computed(() => this.hasPermissionBulkMove());
  canBulkDeleteItems = computed(() => this.hasPermissionBulkDelete());

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

    // Réinitialiser immédiatement pour éviter l'affichage de "dossier vide"
    this.state.files.set([]);
    this.state.folders.set([]);
    this.state.clearSelection();

    const currentFolder = this.state.currentFolder();
    const folderId = currentFolder?.id || null;
    const page = this.state.currentPage();
    const pageSize = this.state.pageSize();
    const sort = this.state.currentSort();
    const search = this.state.searchQuery();
    const folderPath = search ?
      undefined : (currentFolder?.path || undefined);
    const currentParams = this.route.snapshot.queryParams;
    const hasAnyFilter = this.appliedFilters().length > 0;

    // Utiliser forkJoin pour charger files et folders en parallèle
    const requests: any = {
      files: this.mediaService.getFiles(folderId, folderPath, page, pageSize, sort, search, currentParams)
    };

    // Ajouter les folders seulement si pas de filtres
    if (!hasAnyFilter) {
      requests.folders = this.mediaService.getFolders(folderId, sort, search, currentParams);
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: any) => {
          // Mettre à jour les files
          this.state.files.set(results.files.data.map((f: any) => ({ ...f, type: 'asset' as const, isSelectable: true })));
          this.state.totalItems.set(results.files.meta.pagination.total);

          // Vérifier si la page demandée existe
          const maxPage = Math.ceil(results.files.meta.pagination.total / pageSize);
          if (page > 1 && page > maxPage && results.files.meta.pagination.total > 0) {
            this.updateQueryParams({ page: 1 });
            return;
          }

          // Mettre à jour les folders si disponibles
          if (results.folders) {
            this.state.folders.set(results.folders.data.map((f: any) => ({ ...f, type: 'folder' as const, isSelectable: true })));
          } else {
            this.state.folders.set([]);
          }

          // Fin du loading
          this.state.isLoading.set(false);
        },
        error: () => {
          this.state.isLoading.set(false);
          this.toastService.showError(this.translate.instant('mediaLibrary.errors.loadFiles'));
        }
      });

  }


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
    const currentSort = this.state.currentSort();
    this.state.currentSort.set(sort as SortOption);
    if (currentSort !== sort) {
      this.updateQueryParams({ sort, page: 1 });
    } else {
      this.updateQueryParams({ sort });
    }
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


  onOpenUpload(): void {
    if (!this.canUpload()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
    this.showUploadModal.set(true);
  }

  onCloseUpload(): void {
    this.showUploadModal.set(false);
  }

  onUploadComplete(): void {
    this.refreshCurrentPage();
  }

  private refreshCurrentPage(): void {
    const currentParams = this.route.snapshot.queryParams;
    this.handleRouteChange(currentParams);
  }

  onOpenCreateFolder(): void {
    if (!this.canCreateFolder()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
    this.showCreateFolderModal.set(true);
  }

  onCloseCreateFolder(): void {
    this.showCreateFolderModal.set(false);
  }

  onFolderCreated(): void {
    this.refreshCurrentPage();
  }

  onEditFile(file: MediaFile): void {
    if (!this.canEditFile()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
    this.fileToEdit.set(file);
    this.showEditFileModal.set(true);
  }

  onEditFolder(folder: MediaFolder): void {
    if (!this.canEditFolder()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
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
    this.refreshCurrentPage();
  }

  onMoveItem(item: MediaFile | MediaFolder): void {
    if (!this.canMoveItems()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
    this.filesToMove.set([item]);
    this.loadFolderStructureAndOpenModal();
  }

  onMoveBulk(): void {
    if (!this.canMoveItems()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }
    this.filesToMove.set(this.state.selectedItems());
    this.loadFolderStructureAndOpenModal();
  }

  private loadFolderStructureAndOpenModal(): void {
    const itemsToMove = this.filesToMove();
    const folderIdsToMove = itemsToMove
      .filter(i => i.type === 'folder')
      .map(i => i.documentId);

    const onlyFiles = folderIdsToMove.length === 0;

    this.mediaService.getFolderStructure()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const currentFolder = this.state.currentFolder();

          const currentFolderId = onlyFiles ? undefined : currentFolder?.documentId;

          const filteredStructure = this.filterInvalidDestinations(
            response.data,
            folderIdsToMove,
            currentFolderId
          );

          const structure: FolderTreeNode[] = [];

          if (currentFolder !== null) {
            structure.push({
              value: null,
              label: this.translate.instant('mediaLibrary.move.root'),
              children: filteredStructure
            });

            if (onlyFiles && currentFolder) {
              this.selectedDestinationFolder.set(currentFolder.documentId);
            } else {
              this.selectedDestinationFolder.set(null);
            }
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
    this.refreshCurrentPage();
  }

  onDestinationChange(destination: string | null): void {
    this.selectedDestinationFolder.set(destination);
  }

  async onDeleteFile(file: MediaFile): Promise<void> {
    if (!this.canDeleteFile()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }

    const confirmed = await this.confirmDialog.confirmDelete(file.name);
    if (!confirmed) return;

    this.mediaService.deleteFile(file.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.fileDeleted', { name: file.name })
          );
          this.refreshCurrentPage();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.deleteFileFailed', { message: error.message })
          );
        }
      });
  }

  async onDeleteFolder(folder: MediaFolder): Promise<void> {
    if (!this.canDeleteFolder()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }

    const confirmed = await this.confirmDialog.confirmDelete(folder.name);
    if (!confirmed) return;

    this.mediaService.deleteFolder(folder.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.folderDeleted', { name: folder.name })
          );
          this.refreshCurrentPage();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.deleteFolderFailed', { message: error.message })
          );
        }
      });
  }

  async onBulkDelete(): Promise<void> {
    if (!this.canBulkDeleteItems()) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.noPermission'));
      return;
    }

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
          this.refreshCurrentPage();
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
    return this.state.canSelectItem(item, this.currentUserDocumentId());
  }


  onTableSort(field: 'name' | 'createdAt'): void {
    const currentSort = this.state.currentSort();
    const [currentField, currentDirection] = currentSort.split(':') as [string, 'ASC' | 'DESC'];

    let newSort: SortOption;

    if (currentField === field) {
      newSort = `${field}:${currentDirection === 'ASC' ? 'DESC' : 'ASC'}` as SortOption;
    } else {
      newSort = `${field}:DESC` as SortOption;
    }

    this.state.currentSort.set(newSort);
    this.updateQueryParams({ sort: newSort, page: 1 });
  }

  getSortIcon(field: 'name' | 'createdAt'): string {
    const currentSort = this.state.currentSort();
    const [currentField, currentDirection] = currentSort.split(':');

    if (currentField !== field) {
      return 'unfold_more';
    }

    return currentDirection === 'ASC' ? 'arrow_upward' : 'arrow_downward';
  }

}
