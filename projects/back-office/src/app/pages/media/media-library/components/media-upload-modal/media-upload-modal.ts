import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MediaService } from '../../../../../core/services/media/media.service';
import { ToastService, FileUpload, UploadedFile } from 'shared-lib';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MediaFolder, MediaFile } from '../../../../../core/models/media/media-file.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-media-upload-modal',
  standalone: true,
  imports: [TranslatePipe, FileUpload],
  templateUrl: './media-upload-modal.html',
  styleUrl: './media-upload-modal.css'
})
export class MediaUploadModal {
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  currentFolder = input<MediaFolder | null>(null);

  close = output<void>();
  uploadComplete = output<void>();

  isUploading = signal(false);

  folderName = computed(() => this.currentFolder()?.name || this.translate.instant('mediaLibrary.root'));

  uploadContext = computed(() => ({
    folderId: this.currentFolder()?.documentId
  }));

  customUploadFn = (files: File[], context?: any): Observable<any> => {
    this.isUploading.set(true);
    const folderId = context?.folderId;

    return this.mediaService.uploadFiles(files, folderId).pipe(
      map(response => {
        this.isUploading.set(false);

        const uploadedFiles: UploadedFile[] = response.data.map((file: MediaFile) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.mime,
          url: file.url,
          status: 'success' as const,
          metadata: {
            documentId: file.documentId,
            ext: file.ext,
            hash: file.hash,
            formats: file.formats
          }
        }));

        return uploadedFiles;
      })
    );
  };

  responseTransformer = (response: any): UploadedFile[] => {
    return response;
  };

  onUploadComplete(files: UploadedFile[]): void {
    const successCount = files.filter(f => f.status === 'success').length;

    if (successCount > 0) {
      this.uploadComplete.emit();
      this.closeModal();
    }
  }

  onUploadError(error: { index: number; error: string }): void {
    this.isUploading.set(false);
  }

  onClose(): void {
    if (this.isUploading()) {
      const confirmed = confirm(this.translate.instant('mediaLibrary.confirm.cancelUpload'));
      if (!confirmed) return;
    }
    this.closeModal();
  }

  private closeModal(): void {
    const modalElement = document.getElementById('uploadModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    this.close.emit();
  }

  constructor() {
    effect(() => {
      if (this.show()) {
        const modalElement = document.getElementById('uploadModal');
        if (modalElement) {
          const modal = new (window as any).bootstrap.Modal(modalElement);
          modal.show();
        }
      }
    });
  }
}
