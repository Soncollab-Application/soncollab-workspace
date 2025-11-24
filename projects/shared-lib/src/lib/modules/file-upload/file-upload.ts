import {
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadConfig, UploadedFile } from './file-upload.model';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { ToastService } from '../toast';
import { finalize, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-file-upload',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  providers: [FileUploadService]
})
export class FileUpload implements OnInit, OnDestroy {
  private uploadService = inject(FileUploadService);
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  private instance = this.uploadService.createInstance();

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
  @Input() customUploadFn?: (files: File[], context?: any) => any;
  @Input() uploadContext?: any;
  @Input() responseTransformer?: (response: any) => UploadedFile[];
  @Input() validateDuplicateFn?: (file: File, existingFiles: UploadedFile[]) => boolean;
  @Input() filePreviewFn?: (file: UploadedFile) => string | null;

  @Output() filesSelected = new EventEmitter<UploadedFile[]>();
  @Output() fileRemoved = new EventEmitter<number>();
  @Output() uploadComplete = new EventEmitter<UploadedFile[]>();
  @Output() uploadError = new EventEmitter<{ index: number; error: string }>();
  @Output() uploadProgress = new EventEmitter<{ index: number; progress: number }>();

  isDragging = signal(false);
  files = this.instance.files;
  hasPendingFiles = this.instance.hasPendingFiles;
  hasUploadingFiles = this.instance.hasUploadingFiles;
  hasSuccessFiles = this.instance.hasSuccessFiles;
  hasErrorFiles = this.instance.hasErrorFiles;
  totalSize = this.instance.totalSize;
  hintText = signal('');

  constructor() {
    effect(() => {
      this.instance.setConfig({
        multiple: this.multiple,
        accept: this.accept,
        maxSize: this.maxSize,
        maxFiles: this.maxFiles,
        autoUpload: this.autoUpload,
        uploadUrl: this.uploadUrl,
        allowDuplicates: this.allowDuplicates,
        customUploadFn: this.customUploadFn,
        uploadContext: this.uploadContext,
        responseTransformer: this.responseTransformer,
        validateDuplicateFn: this.validateDuplicateFn,
        filePreviewFn: this.filePreviewFn
      });
    });

    effect(() => {
      const hint = this.translate.instant('fileUploadShared.hint', { maxSize: this.maxSize });
      untracked(() => {
        this.hintText.set(hint);
      });
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    await this.processFiles(Array.from(input.files));
    input.value = '';
  }

  private async processFiles(fileList: File[]): Promise<void> {
    const config = this.instance.config();
    const validFiles: UploadedFile[] = [];

    for (const file of fileList) {
      if (!this.uploadService.validateFileSize(file, config.maxSize!)) {
        this.toast.showError(
          this.translate.instant('fileUploadShared.errors.maxSize', { maxSize: config.maxSize })
        );
        continue;
      }

      if (!this.uploadService.validateFileType(file, config.accept!)) {
        this.toast.showError(
          this.translate.instant('fileUploadShared.errors.fileType')
        );
        continue;
      }

      const preview = config.filePreviewFn
        ? config.filePreviewFn({ name: file.name, size: file.size, type: file.type, file, status: 'pending' })
        : await this.uploadService.generatePreview(file);

      validFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        preview: preview || undefined,
        status: 'pending',
        progress: 0
      });
    }

    if (validFiles.length === 0) return;

    const result = this.instance.addFiles(validFiles);

    if (!result.success) {
      if (result.error === 'maxFiles') {
        this.toast.showError(
          this.translate.instant('fileUploadShared.errors.maxFiles', { max: result.max })
        );
      } else if (result.error === 'multipleNotAllowed') {
        this.toast.showError(
          this.translate.instant('fileUploadShared.errors.multipleNotAllowed')
        );
      } else if (result.error === 'duplicates') {
        this.toast.showWarning(
          this.translate.instant('fileUploadShared.errors.duplicates')
        );
      }
      return;
    }

    this.toast.showSuccess(
      this.translate.instant('fileUploadShared.messages.filesAdded', { count: result.count })
    );

    this.filesSelected.emit(this.files());

    if (config.autoUpload) {
      this.uploadAll();
    }
  }

  removeFile(index: number): void {
    const file = this.files()[index];
    this.instance.removeFile(index);
    this.fileRemoved.emit(index);
    this.toast.showInfo(
      this.translate.instant('fileUploadShared.messages.fileRemoved', { name: file.name })
    );
  }

  clearAll(): void {
    const count = this.files().length;
    this.instance.clearAll();
    this.toast.showInfo(
      this.translate.instant('fileUploadShared.messages.allFilesCleared', { count })
    );
  }

  clearUploaded(): void {
    this.instance.clearUploaded();
  }

  clearErrors(): void {
    this.instance.clearErrors();
  }

  uploadAll(): void {
    const filesToUpload = this.files().filter(f => f.status === 'pending');

    if (filesToUpload.length === 0) {
      this.toast.showWarning(
        this.translate.instant('fileUploadShared.messages.noPendingFiles')
      );
      return;
    }

    const currentConfig = {
      customUploadFn: this.customUploadFn,
      uploadContext: this.uploadContext,
      responseTransformer: this.responseTransformer,
      uploadUrl: this.uploadUrl
    };

    if (currentConfig.customUploadFn) {
      const files = filesToUpload.map(f => f.file!);

      currentConfig.customUploadFn(files, currentConfig.uploadContext)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            const uploadedFiles = currentConfig.responseTransformer
              ? currentConfig.responseTransformer(response)
              : response;

            filesToUpload.forEach((file, index) => {
              const fileIndex = this.files().findIndex(f => f.name === file.name);
              this.instance.updateFileStatus(fileIndex, 'success', 100, undefined, uploadedFiles[index]?.metadata);
            });

            this.uploadComplete.emit(this.files());
            this.toast.showSuccess(
              this.translate.instant('fileUploadShared.messages.uploadSuccess', { name: 'files' })
            );
          },
          error: (error: { message: string | undefined; }) => {
            filesToUpload.forEach(file => {
              const fileIndex = this.files().findIndex(f => f.name === file.name);
              this.instance.updateFileStatus(fileIndex, 'error', 0, error.message);
            });
            this.toast.showError(
              this.translate.instant('fileUploadShared.errors.uploadFailed')
            );
          }
        });
    } else if (currentConfig.uploadUrl) {
      this.uploadWithHttp(filesToUpload);
    }
  }

  private uploadWithHttp(filesToUpload: UploadedFile[]): void {
    const config = this.instance.config();

    filesToUpload.forEach((file, index) => {
      const fileIndex = this.files().findIndex(f => f.name === file.name);
      this.instance.updateFileStatus(fileIndex, 'uploading', 0);

      const formData = new FormData();
      formData.append('file', file.file!);

      this.http.post<any>(config.uploadUrl!, formData, {
        reportProgress: true,
        observe: 'events'
      })
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {})
        )
        .subscribe({
          next: (event: HttpEvent<any>) => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = Math.round((100 * event.loaded) / (event.total || 1));
              this.instance.updateFileStatus(fileIndex, 'uploading', progress);
              this.uploadProgress.emit({ index: fileIndex, progress });
            } else if (event.type === HttpEventType.Response) {
              this.instance.updateFileStatus(fileIndex, 'success', 100, undefined, event.body);

              if (index === filesToUpload.length - 1) {
                this.uploadComplete.emit(this.files());
              }
            }
          },
          error: (error) => {
            this.instance.updateFileStatus(fileIndex, 'error', 0, error.message);
            this.uploadError.emit({ index: fileIndex, error: error.message });
          }
        });
    });
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

  async onDrop(event: DragEvent): Promise<void> {
    if (!this.dragDrop) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      await this.processFiles(Array.from(files));
    }
  }

  isImageFile(file: UploadedFile): boolean {
    return this.uploadService.isImage(file);
  }

  isVideoFile(file: UploadedFile): boolean {
    return this.uploadService.isVideo(file);
  }

  isAudioFile(file: UploadedFile): boolean {
    return this.uploadService.isAudio(file);
  }

  isPDFFile(file: UploadedFile): boolean {
    return this.uploadService.isPDF(file);
  }

  formatSize(bytes: number): string {
    return this.uploadService.formatFileSize(bytes);
  }

  getPendingCount(): number {
    return this.files().filter(f => f.status === 'pending').length;
  }

  getUploadingCount(): number {
    return this.files().filter(f => f.status === 'uploading').length;
  }

  getSuccessCount(): number {
    return this.files().filter(f => f.status === 'success').length;
  }

  getErrorCount(): number {
    return this.files().filter(f => f.status === 'error').length;
  }
}
