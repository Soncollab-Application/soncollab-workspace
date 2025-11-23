import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {ToastService} from 'shared-lib';
import {MediaFile, MediaFolder} from '../../../../../core/models/media/media-file.model';
import {FormsModule} from '@angular/forms';
import {environment} from '../../../../../../environments/environment';

@Component({
  selector: 'app-media-edit-modal',
  imports: [
    TranslatePipe,
    FormsModule
  ],
  templateUrl: './media-edit-modal.html',
  styleUrl: './media-edit-modal.css',
})
export class MediaEditModal {
  private destroy$ = new Subject<void>();
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  file = input<MediaFile | null>(null);
  folder = input<MediaFolder | null>(null);

  close = output<void>();
  editComplete = output<void>();

  editName = signal('');
  editAlternativeText = signal('');
  editCaption = signal('');
  isSaving = signal(false);

  isFile = computed(() => this.file() !== null);
  isFolder = computed(() => this.folder() !== null);

  isUserFolder = computed(() => {
    const folder = this.folder();
    if (!folder) return false;
    // Si le nom est un documentId (longueur > 20) ou si displayName existe
    return folder.name.length > 20 || !!folder.displayName || !!folder.userEmail;
  });

  folderDisplayName = computed(() => {
    const folder = this.folder();
    if (!folder) return '';
    return folder.displayName || folder.userEmail || folder.name;
  });

  // Preview computed
  isImage = computed(() => {
    const file = this.file();
    return file ? file.mime.startsWith('image/') : false;
  });

  isVideo = computed(() => {
    const file = this.file();
    return file ? file.mime.startsWith('video/') : false;
  });

  isAudio = computed(() => {
    const file = this.file();
    return file ? file.mime.startsWith('audio/') : false;
  });

  isPDF = computed(() => {
    const file = this.file();
    return file ? file.mime.includes('pdf') : false;
  });

  thumbnailUrl = computed(() => {
    const file = this.file();
    if (!file) return '';
    const url = file.formats?.thumbnail?.url || file.url;
    return url.startsWith('http') ? url : environment.api.baseUrl + url;
  });

  fullUrl = computed(() => {
    const file = this.file();
    if (!file) return '';
    const url = file.url;
    return url.startsWith('http') ? url : environment.api.baseUrl + url;
  });

  constructor() {
    effect(() => {
      const file = this.file();
      const folder = this.folder();

      if (file) {
        this.editName.set(file.name);
        this.editAlternativeText.set(file.alternativeText || '');
        this.editCaption.set(file.caption || '');
      } else if (folder) {
        if (this.isUserFolder()) {
          this.editName.set(''); // Vide car non éditable
        } else {
          this.editName.set(folder.name);
        }
        this.editAlternativeText.set('');
        this.editCaption.set('');
      }
    });
  }

  save(): void {
    const name = this.editName().trim();

    if (this.isFolder() && this.isUserFolder()) {
      this.toastService.showWarning(
        this.translate.instant('mediaLibrary.warnings.cannotRenameUserFolder')
      );
      return;
    }

    if (!name) return;

    this.isSaving.set(true);

    if (this.isFile()) {
      const file = this.file()!;
      const data = {
        name,
        alternativeText: this.editAlternativeText(),
        caption: this.editCaption()
      };

      this.mediaService.updateFile(file.documentId, data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess(
              this.translate.instant('mediaLibrary.success.fileUpdated')
            );
            this.isSaving.set(false);
            this.editComplete.emit();
            this.close.emit();
          },
          error: (error) => {
            this.toastService.showError(
              this.translate.instant('mediaLibrary.errors.updateFileFailed', { message: error.message })
            );
            this.isSaving.set(false);
          }
        });
    } else if (this.isFolder()) {
      const folder = this.folder()!;
      const data = { name };

      this.mediaService.updateFolder(folder.documentId, data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess(
              this.translate.instant('mediaLibrary.success.folderUpdated', { name })
            );
            this.isSaving.set(false);
            this.editComplete.emit();
            this.close.emit();
          },
          error: (error) => {
            this.toastService.showError(
              this.translate.instant('mediaLibrary.errors.updateFolderFailed', { message: error.message })
            );
            this.isSaving.set(false);
          }
        });
    }
  }

  getFileIcon(): string {
    const file = this.file();
    if (!file) return 'insert_drive_file';

    const mime = file.mime;
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
