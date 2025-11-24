import { Component, inject, input, output, signal, effect, computed, OnDestroy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import {BreadcrumbItem, getBreadcrumbData} from '../../utils/breadcrumb.utils';
import {MediaAssetItem} from '../media-asset-item/media-asset-item';
import {MediaFolderItem} from '../media-folder-item/media-folder-item';
import {MediaService} from '../../../../../core/services/media/media.service';
import {MediaFile, MediaFolder} from '../../../../../core/models/media/media-file.model';
import {MediaLibraryState} from '../../media-library.state';
import {AuthService} from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-media-picker-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MediaAssetItem, MediaFolderItem],
  templateUrl: './media-picker-modal.html',
  styleUrl: './media-picker-modal.css'
})
export class MediaPickerModal implements OnDestroy {
  private mediaService = inject(MediaService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  show = input.required<boolean>();

  close = output<void>();
  fileSelected = output<MediaFile>();

  state = new MediaLibraryState();
  breadcrumbs = signal<BreadcrumbItem[]>([]);
  selectedFile = signal<MediaFile | null>(null);

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
          this.loadData();
          this.isInitialized = true;
        }
        setTimeout(() => this.openModal(), 0);
      } else {
        this.isInitialized = false;
        this.closeModal();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
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

  private loadData(): void {
    this.state.isLoading.set(true);
    this.state.files.set([]);
    this.state.folders.set([]);

    const currentFolder = this.state.currentFolder();
    const folderId = currentFolder?.id || null;

    this.mediaService.getFiles(folderId, undefined, 1, 50, 'createdAt:DESC')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const imageFiles = response.data
            .filter(f => f.mime.startsWith('image/'))
            .map(f => ({ ...f, type: 'asset' as const, isSelectable: false }));

          this.state.files.set(imageFiles);
          this.state.isLoading.set(false);
        },
        error: () => {
          this.state.isLoading.set(false);
        }
      });

    this.mediaService.getFolders(folderId, 'name:ASC')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const userId = this.currentUserDocumentId();
          const folders = response.data
            .filter(f => {
              if (!userId) return true;
              if (f.name === 'users') return false;
              return true;
            })
            .map(f => ({ ...f, type: 'folder' as const, isSelectable: false }));

          this.state.folders.set(folders);
        }
      });

    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs(): void {
    this.breadcrumbs.set(getBreadcrumbData(this.state.currentFolder()));
  }

  onFolderClick(folder: MediaFolder): void {
    this.mediaService.getFolder(folder.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.state.currentFolder.set(response.data);
          this.loadData();
        }
      });
  }

  onBreadcrumbClick(item: BreadcrumbItem): void {
    if (item.id === null) {
      this.state.currentFolder.set(null);
    } else if (item.folder) {
      this.state.currentFolder.set(item.folder);
    }
    this.loadData();
  }

  onFileClick(file: MediaFile): void {
    if (this.selectedFile()?.id === file.id) {
      this.selectedFile.set(null);
    } else {
      this.selectedFile.set(file);
    }
  }

  confirmSelection(): void {
    const selected = this.selectedFile();

    if (selected) {
      this.fileSelected.emit(selected);
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
