import {Component, inject, input, output, signal} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {ToastService} from 'shared-lib';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';


@Component({
  selector: 'app-media-upload-modal',
  imports: [
    TranslatePipe
  ],
  templateUrl: './media-upload-modal.html',
  styleUrl: './media-upload-modal.css',
})
export class MediaUploadModal {
  private destroy$ = new Subject<void>();
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  currentFolder = input<MediaFolder | null>(null);

  close = output<void>();
  uploadComplete = output<void>();

  selectedFiles = signal<File[]>([]);
  isUploading = signal(false);

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles.set(Array.from(input.files));
    }
  }

  upload(): void {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.isUploading.set(true);

    const folderId = this.currentFolder()?.documentId;

    this.mediaService.uploadFiles(files, folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.fileUploaded')
          );
          this.selectedFiles.set([]);
          this.isUploading.set(false);
          this.uploadComplete.emit();
          this.close.emit();
        },
        error: () => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.uploadFailed')
          );
          this.isUploading.set(false);
        }
      });
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
