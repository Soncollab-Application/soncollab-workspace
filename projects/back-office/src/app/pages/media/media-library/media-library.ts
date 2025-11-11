import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MediaService } from '../../../core/services/media/media.service';
import {
  MediaFile,
  MediaFolder,
  MediaFilters,
  MediaStats
} from '../../../core/models/media/media-file.model';
import {
  FilterBarComponent,
  FilterConfig,
  SortOption,
  ToastService,
  ConfirmDialogService,
  KpiCardComponent,
  KpiData,
  PermissionService,
  LanguageOrchestratorService,
  ListStateManager,
  FilterValue,
  getUserInitials, EmptyStateComponent
} from 'shared-lib';
import { Breadcrumb } from '../../../core/components/breadcrumb/breadcrumb';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    FilterBarComponent,
    KpiCardComponent,
    EmptyStateComponent
  ],
  templateUrl: './media-library.html',
  styleUrl: './media-library.css',
  providers: [ListStateManager]
})
export class MediaLibrary implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  protected router = inject(Router);
  protected listManager = inject(ListStateManager<MediaFile, MediaFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'media-library';

  // Permissions
  canListFiles = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'list'));
  canUploadFiles = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'upload'));
  canUpdateFiles = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'update'));
  canDeleteFiles = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'delete'));
  canBulkDelete = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'bulkDelete'));
  canManageFolders = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'listFolders'));
  canViewStats = computed(() => this.permissionsService.hasPermission('media-library', 'media-library', 'stats'));

  isContentManager = computed(() => this.currentUser()?.role.type === 'soncollab_content');

  // Navigation dossiers
  currentFolder = signal<MediaFolder | null>(null);
  breadcrumbPath = signal<MediaFolder[]>([]);




  // Données
  folders = signal<MediaFolder[]>([]);
  stats = signal<MediaStats | null>(null);

  // UI State
  loading = signal(false);
  loadingStats = signal(false);
  viewMode = signal<'card' | 'table'>('card');
  selectedFiles = signal<Set<string>>(new Set());

  baseUrl = environment.api.baseUrl;
  currentUser = computed(() => this.authService.currentUser);
  isAdmin = computed(() => this.currentUser()?.role.type === 'soncollab_admin');

  emptyTitle = signal('');
  emptyMessage = signal('');
  private languageChange = signal(0);

  // Computed pour navigation
  isInRootFolder = computed(() => this.currentFolder() === null);

  displayedFolders = computed(() => {
    // Content manager : filtrer pour ne montrer que ses dossiers
    if (this.isContentManager()) {
      // Si Content Manager, on ne montre que les dossiers chargés dans loadUserRootFolder,
      // qui sont censés être les dossiers de l'utilisateur.
      // Si on est dans un sous-dossier, on affiche ses enfants.
      if (this.currentFolder()) {
        return this.currentFolder()?.children || [];
      }
      // À la racine, on affiche le dossier racine de l'utilisateur (qui est le seul dans this.folders() après loadUserRootFolder)
      return this.folders();
    }

    if (this.currentFolder()) {
      return this.currentFolder()?.children || [];
    }

    // Admin à la racine : tous les dossiers
    return this.folders();
  });

  displayedFiles = computed(() => {
    const current = this.currentFolder();
    if (current && current.files) {
      // Dans un dossier : retourner les fichiers du dossier
      return Array.isArray(current.files) ? current.files : [];
    }
    // À la racine : utiliser listManager
    return this.listManager.items();
  });

  // KPIs
  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('media-library.kpis.total_files'),
        value: statsData.total.files.toString(),
        icon: 'perm_media',
        trend: undefined,
        description: statsData.total.sizeFormatted
      },
      {
        label: this.translate.instant('media-library.kpis.images'),
        value: statsData.byType.images.toString(),
        icon: 'image',
        trend: undefined
      },
      {
        label: this.translate.instant('media-library.kpis.videos'),
        value: statsData.byType.videos.toString(),
        icon: 'videocam',
        trend: undefined
      },
      {
        label: this.translate.instant('media-library.kpis.documents'),
        value: statsData.byType.documents.toString(),
        icon: 'description',
        trend: undefined
      }
    ];
  });

  // Filtres
  filters = computed<FilterConfig[]>(() => {
    const baseFilters: FilterConfig[] = [
      {
        key: 'mime',
        label: this.translate.instant('media-library.filters.type'),
        type: 'select',
        options: [
          { value: '', label: this.translate.instant('media-library.filters.all_types') },
          { value: 'image', label: this.translate.instant('media-library.filters.images') },
          { value: 'video', label: this.translate.instant('media-library.filters.videos') },
          { value: 'document', label: this.translate.instant('media-library.filters.documents') },
          { value: 'audio', label: this.translate.instant('media-library.filters.audio') }
        ]
      }
    ];

    if (this.isAdmin()) {
      baseFilters.push({
        key: 'uploaded_by',
        label: this.translate.instant('media-library.filters.uploaded_by'),
        type: 'text',
        placeholder: this.translate.instant('media-library.filters.user_email')
      });
    }

    return baseFilters;
  });

  sortOptions = computed<SortOption[]>(() => [
    {
      value: 'createdAt:desc',
      label: this.translate.instant('media-library.sort.recent')
    },
    {
      value: 'name:asc',
      label: this.translate.instant('media-library.sort.name_asc')
    },
    {
      value: 'name:desc',
      label: this.translate.instant('media-library.sort.name_desc')
    },
    {
      value: 'size:desc',
      label: this.translate.instant('media-library.sort.size_desc')
    }
  ]);

  hasSelection = computed(() => this.selectedFiles().size > 0);
  selectedCount = computed(() => this.selectedFiles().size);

  // Expose utils
  protected getUserInitials = getUserInitials;
  protected readonly Math = Math;

  ngOnInit(): void {
    if (!this.canListFiles()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      this.router.navigate(['/']);
      return;
    }

    this.listManager.initialize(
      {
        componentId: this.componentId,
        defaultSort: { field: 'createdAt', direction: 'desc' },
        pageSize: 24,
        onLanguageChange: () => {
          this.languageChange.update(v => v + 1);
          this.updateEmptyState();
          if (this.canViewStats()) {
            this.loadStats();
          }
        }
      },
      (search: string, filters: FilterValue) => this.buildFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadFiles(page, pageSize, filters, sortField, sortDirection),
      this.canListFiles
    );

    if (this.canViewStats()) {
      this.loadStats();
    }

    if (this.canManageFolders()) {
      // Si content manager, charger directement son dossier
      if (this.isContentManager()) {
        this.loadUserRootFolder();
      } else {
        // Admin : charger tous les dossiers
        this.loadFolders();
      }
    }

    this.updateEmptyState();
  }

  ngOnDestroy(): void {
    this.listManager.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserRootFolder(): void {
    const user = this.currentUser();
    if (!user) return;

    // Charger les dossiers et trouver le dossier de l'utilisateur
    this.mediaService.getFolders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Chercher le dossier "users/soncollab_content/{email}"
          const userFolder = response.data.find(f =>
            f.path.includes(`soncollab_content/${user.email}`)
          );

          if (userFolder) {
            // Au lieu de charger le contenu du dossier, on le met comme dossier racine
            // pour le Content Manager.
            this.folders.set([userFolder]);
          } else {
            // Pas de dossier trouvé, rester à la racine
            this.folders.set([]);
          }
        },
        error: (error) => {
          console.error('Error loading user folder:', error);
        }
      });
  }

  createFolder(): void {
    if (!this.canManageFolders()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      return;
    }

    const folderName = prompt(this.translate.instant('media-library.create_folder_prompt'));

    if (!folderName) return;

    const parentPath = this.currentFolder()?.path || undefined;

    this.mediaService.createFolder({ name: folderName, parentPath })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.showSuccess(
            this.translate.instant('media-library.success.folder_created')
          );

          if (this.isInRootFolder()) {
            this.loadFolders();
          } else {
            this.loadFolderContent(this.currentFolder()!.documentId);
          }
        },
        error: (error) => {
          console.error('Create folder error:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.create_folder_error')
          );
        }
      });
  }

  editFile(file: MediaFile, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.canUpdateFiles()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      return;
    }

    const newName = prompt(
      this.translate.instant('media-library.edit_file_prompt'),
      file.name
    );

    if (!newName || newName === file.name) return;

    this.mediaService.updateFile(file.documentId, { name: newName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('media-library.success.file_updated')
          );

          if (this.isInRootFolder()) {
            this.listManager.reload();
          } else {
            this.loadFolderContent(this.currentFolder()!.documentId);
          }
        },
        error: (error) => {
          console.error('Update file error:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.update_file_error')
          );
        }
      });
  }

  private updateEmptyState(): void {
    this.emptyTitle.set(this.translate.instant('media-library.empty.title'));
    this.emptyMessage.set(this.translate.instant('media-library.empty.message'));
  }

  private buildFilters(search: string, filters: FilterValue): MediaFilters {
    return {
      search: search || undefined,
      mime: filters['mime'] as any || undefined,
      uploaded_by: filters['uploaded_by'] as string || undefined
    };
  }

  private loadFiles(
    page: number,
    pageSize: number,
    filters: MediaFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    const params: MediaFilters = {
      ...filters,
      page,
      pageSize
    };

    this.mediaService.getFiles(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.listManager.setData(
            response.data,
            response.meta.pagination.total,
            response.meta.pagination.pageCount
          );
        },
        error: (error) => {
          console.error('Error loading files:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.load_files_error')
          );
          this.listManager.setError();
        }
      });
  }

  loadStats(): void {
    if (!this.canViewStats()) return;

    this.loadingStats.set(true);
    this.mediaService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats.set(response.data);
          this.loadingStats.set(false);
        },
        error: (error) => {
          console.error('Error loading stats:', error);
          this.loadingStats.set(false);
        }
      });
  }

  loadFolders(): void {
    if (!this.canManageFolders()) return;

    this.mediaService.getFolders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.folders.set(response.data);
        },
        error: (error) => {
          console.error('Error loading folders:', error);
        }
      });
  }

  /**
   * Navigation dans les dossiers
   */
  navigateToFolder(folder: MediaFolder): void {
    if (!this.canManageFolders()) return;

    const currentPath = this.breadcrumbPath();
    const current = this.currentFolder();

    if (current) {
      this.breadcrumbPath.set([...currentPath, current]);
    }

    this.loadFolderContent(folder.documentId);
  }

  loadFolderContent(folderId: string): void {
    if (!this.canManageFolders()) return;

    this.loading.set(true);

    this.mediaService.getFolderById(folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentFolder.set(response.data);
          this.selectedFiles.set(new Set());
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading folder:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.load_folder_error')
          );
          this.loading.set(false);
        }
      });
  }

  goToRoot(): void {
    this.currentFolder.set(null);
    this.breadcrumbPath.set([]);
    this.selectedFiles.set(new Set());
    this.listManager.reload();
    this.loadFolders();
  }

  navigateToBreadcrumb(index: number): void {
    const path = this.breadcrumbPath();

    if (index === -1) {
      this.goToRoot();
    } else {
      const targetFolder = path[index];
      this.breadcrumbPath.set(path.slice(0, index));
      this.loadFolderContent(targetFolder.documentId);
    }
  }

  goBack(): void {
    const path = this.breadcrumbPath();

    if (path.length === 0) {
      this.goToRoot();
    } else {
      const parentFolder = path[path.length - 1];
      this.breadcrumbPath.set(path.slice(0, -1));
      this.loadFolderContent(parentFolder.documentId);
    }
  }

  getFolderFileCount(folder: MediaFolder): number {
    return folder.files?.count || 0;
  }

  /**
   * Upload de fichiers
   */
  onFilesSelected(event: Event): void {
    if (!this.canUploadFiles()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const filesArray = Array.from(input.files);
    this.uploadFiles(filesArray);

    input.value = '';
  }

  uploadFiles(files: File[]): void {
    if (!this.canUploadFiles()) return;

    this.loading.set(true);

    this.mediaService.uploadFiles(files)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.showSuccess(
            this.translate.instant('media-library.success.upload', { count: response.data.length })
          );

          if (this.isInRootFolder()) {
            this.listManager.reload();
          } else {
            this.loadFolderContent(this.currentFolder()!.documentId);
          }

          if (this.canViewStats()) {
            this.loadStats();
          }

          this.loading.set(false);
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.upload_error')
          );
          this.loading.set(false);
        }
      });
  }

  /**
   * Sélection de fichiers
   */
  protected toggleFileSelection(fileId: string): void {
    const selected = new Set(this.selectedFiles());

    if (selected.has(fileId)) {
      selected.delete(fileId);
    } else {
      selected.add(fileId);
    }

    this.selectedFiles.set(selected);
  }

  protected selectAll(): void {
    const files = this.displayedFiles();
    const allFileIds = new Set(files.map(f => f.documentId));
    this.selectedFiles.set(allFileIds);
  }

  protected clearSelection(): void {
    this.selectedFiles.set(new Set());
  }

  /**
   * Suppression
   */
  deleteSelected(): void {
    if (!this.canBulkDelete()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      return;
    }

    const selected = Array.from(this.selectedFiles());
    if (selected.length === 0) return;

    this.confirmDialog.open({
      title: this.translate.instant('media-library.confirm.delete_title'),
      message: this.translate.instant('media-library.confirm.delete_message', { count: selected.length }),
      confirmText: this.translate.instant('common.delete'),
      cancelText: this.translate.instant('common.cancel'),
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    }).then((confirmed: boolean) => {
      if (confirmed) {
        this.bulkDelete(selected);
      }
    });
  }

  bulkDelete(documentIds: string[]): void {
    this.loading.set(true);

    this.mediaService.bulkDeleteFiles(documentIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.showSuccess(response.message);
          this.selectedFiles.set(new Set());

          if (this.isInRootFolder()) {
            this.listManager.reload();
          } else {
            this.loadFolderContent(this.currentFolder()!.documentId);
          }

          if (this.canViewStats()) {
            this.loadStats();
          }
        },
        error: (error) => {
          console.error('Delete error:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.delete_error')
          );
          this.loading.set(false);
        }
      });
  }

  deleteFile(file: MediaFile): void {
    if (!this.canDeleteFiles()) {
      this.toastService.showError(
        this.translate.instant('permissionShared.denied.message')
      );
      return;
    }

    this.confirmDialog.open({
      title: this.translate.instant('media-library.confirm.delete_file_title'),
      message: this.translate.instant('media-library.confirm.delete_file_message', { name: file.name }),
      confirmText: this.translate.instant('common.delete'),
      cancelText: this.translate.instant('common.cancel'),
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    }).then((confirmed: boolean) => {
      if (confirmed) {
        this.performDeleteFile(file.documentId);
      }
    });
  }

  performDeleteFile(documentId: string): void {
    this.loading.set(true);

    this.mediaService.deleteFile(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.toastService.showSuccess(response.message);

          if (this.isInRootFolder()) {
            this.listManager.reload();
          } else {
            this.loadFolderContent(this.currentFolder()!.documentId);
          }

          if (this.canViewStats()) {
            this.loadStats();
          }
        },
        error: (error) => {
          console.error('Delete error:', error);
          this.toastService.showError(
            this.translate.instant('media-library.errors.delete_error')
          );
          this.loading.set(false);
        }
      });
  }

  /**
   * Helpers
   */
  getFileIcon(file: MediaFile): string {
    if (file.mime.startsWith('image/')) return 'image';
    if (file.mime.startsWith('video/')) return 'videocam';
    if (file.mime.startsWith('audio/')) return 'audio_file';
    if (file.mime === 'application/pdf') return 'picture_as_pdf';
    return 'description';
  }

  getFileUrl(file: MediaFile): string {
    return file.url.startsWith('http') ? file.url : `${this.baseUrl}${file.url}`;
  }

  getThumbnailUrl(file: MediaFile): string {
    if (file.formats?.thumbnail) {
      const url = file.formats.thumbnail.url;
      return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    }
    return this.getFileUrl(file);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  isImage(file: MediaFile): boolean {
    return file.mime.startsWith('image/');
  }
}
