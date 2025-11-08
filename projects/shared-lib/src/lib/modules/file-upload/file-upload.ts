import {
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  Input, OnDestroy,
  OnInit,
  Output,
  signal,
  untracked
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FileUploadService} from './file-upload.service';
import {UploadedFile} from './file-upload.model';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {HttpClient, HttpEvent, HttpEventType} from '@angular/common/http';
import {ToastService} from '../toast';
import {finalize, Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'lib-file-upload',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css'
})
export class FileUpload implements OnInit, OnDestroy {
  private uploadService = inject(FileUploadService);
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  @Input() multiple = true;
  @Input() accept = 'image/*';
  @Input() maxSize = 10;
  @Input() maxFiles = 8;
  @Input() autoUpload = false;
  @Input() uploadUrl?: string;
  @Input() showPreview = true;
  @Input() showFileName = false;
  @Input() showCoverBadge = true;
  @Input() dragDrop = true;
  @Input() allowDuplicates = false;

  @Output() filesSelected = new EventEmitter<UploadedFile[]>();
  @Output() fileRemoved = new EventEmitter<number>();
  @Output() uploadComplete = new EventEmitter<UploadedFile[]>();
  @Output() uploadError = new EventEmitter<{ index: number; error: string }>();
  @Output() uploadProgress = new EventEmitter<{ index: number; progress: number }>();

  isDragging = signal(false);
  files = computed(() => this.uploadService.files$());
  hintText = signal('');

  hasPendingFiles = computed(() =>
    this.files().some(f => f.status === 'pending')
  );

  constructor() {
    effect(() => {
      this.uploadService.setConfig({
        multiple: this.multiple,
        accept: this.accept,
        maxSize: this.maxSize,
        maxFiles: this.maxFiles,
        autoUpload: this.autoUpload,
        uploadUrl: this.uploadUrl,
        allowDuplicates: this.allowDuplicates
      });
    });

    // Mettre à jour le hint quand maxSize change
    effect(() => {
      const hint = this.translate.instant('fileUploadShared.hint', { maxSize: this.maxSize });
      untracked(() => {
        this.hintText.set(hint);
      });
    });
  }

  ngOnInit(): void {
    // Écouter les changements de langue
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateHintText();
      });

    // Initialiser le hint au démarrage
    this.updateHintText();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateHintText(): void {
    const hint = this.translate.instant('fileUploadShared.hint', { maxSize: this.maxSize });
    this.hintText.set(hint);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(input.files);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (!this.dragDrop) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    if (!this.dragDrop) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    if (!this.dragDrop) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  private handleFiles(fileList: FileList): void {
    try {
      const uploadedFiles = this.uploadService.addFiles(fileList);

      if (uploadedFiles.length > 0) {
        this.filesSelected.emit(uploadedFiles);

        this.toast.showSuccess(
          this.translate.instant('fileUploadShared.messages.filesAdded', {
            count: uploadedFiles.length
          })
        );

        if (this.autoUpload && this.uploadUrl) {
          uploadedFiles.forEach((_, index) => {
            const actualIndex = this.files().length - uploadedFiles.length + index;
            this.uploadFile(actualIndex);
          });
        }
      }
    } catch (error: any) {
      console.error('Error adding files:', error);
      const errorMessage = this.getErrorMessage(error.message);
      this.toast.showError(errorMessage);
    }
  }

  uploadFile(index: number): void {
    const file = this.uploadService.getFile(index);
    if (!file || !file.file || !this.uploadUrl) {
      return;
    }

    const formData = new FormData();
    formData.append('files', file.file);

    this.uploadService.updateFileStatus(index, 'uploading');

    this.http.post(this.uploadUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      finalize(() => {})
    ).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
          this.uploadService.updateFileProgress(index, progress);
          this.uploadProgress.emit({ index, progress });
        } else if (event.type === HttpEventType.Response) {
          const response = event.body;
          const url = response?.url || response?.data?.url;
          this.uploadService.updateFileStatus(index, 'success', undefined, url);

          this.toast.showSuccess(
            this.translate.instant('fileUploadShared.messages.uploadSuccess', {
              name: file.name
            })
          );

          const uploadedFile = this.uploadService.getFile(index);
          if (uploadedFile) {
            this.uploadComplete.emit([uploadedFile]);
          }
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        const errorMessage = error.error?.message || error.message || 'Upload failed';
        this.uploadService.updateFileStatus(index, 'error', errorMessage);

        this.toast.showError(
          this.translate.instant('fileUploadShared.messages.uploadError', {
            name: file.name
          })
        );

        this.uploadError.emit({ index, error: errorMessage });
      }
    });
  }

  uploadAll(): void {
    const pendingFiles = this.files().filter(f => f.status === 'pending');

    if (pendingFiles.length === 0) {
      this.toast.showWarning(
        this.translate.instant('fileUploadShared.messages.noPendingFiles')
      );
      return;
    }

    this.files().forEach((file, index) => {
      if (file.status === 'pending') {
        this.uploadFile(index);
      }
    });
  }

  private getErrorMessage(error: string): string {
    if (error.includes('Multiple files not allowed')) {
      return this.translate.instant('fileUploadShared.errors.multipleNotAllowed');
    }
    if (error.includes('Maximum')) {
      return this.translate.instant('fileUploadShared.errors.maxFiles', { max: this.maxFiles });
    }
    if (error.includes('exceeds')) {
      return this.translate.instant('fileUploadShared.errors.maxSize', { maxSize: this.maxSize });
    }
    if (error.includes('duplicates')) {
      return this.translate.instant('fileUploadShared.errors.duplicates');
    }
    return error;
  }

  removeFile(index: number): void {
    const file = this.uploadService.getFile(index);
    this.uploadService.removeFile(index);
    this.fileRemoved.emit(index);

    if (file) {
      this.toast.showInfo(
        this.translate.instant('fileUploadShared.messages.fileRemoved', {
          name: file.name
        })
      );
    }
  }

  clearAll(): void {
    const count = this.files().length;
    this.uploadService.clearFiles();

    this.toast.showInfo(
      this.translate.instant('fileUploadShared.messages.allFilesCleared', {
        count
      })
    );
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('audio/')) return 'audio_file';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    return 'insert_drive_file';
  }
}
