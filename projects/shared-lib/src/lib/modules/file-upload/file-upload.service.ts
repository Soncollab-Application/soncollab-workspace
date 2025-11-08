import { Injectable, signal, computed } from '@angular/core';
import {FileUploadConfig, UploadedFile} from './file-upload.model';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private files = signal<UploadedFile[]>([]);
  private config = signal<FileUploadConfig>({
    multiple: false,
    accept: 'image/*',
    maxSize: 10,
    maxFiles: 5,
    autoUpload: false,
    allowDuplicates: false
  });

  files$ = computed(() => this.files());
  config$ = computed(() => this.config());

  setConfig(config: FileUploadConfig): void {
    this.config.update(current => ({ ...current, ...config }));
  }

  addFiles(fileList: FileList): UploadedFile[] {
    const newFiles: UploadedFile[] = [];
    const currentFiles = this.files();
    const maxFiles = this.config().maxFiles || 5;
    const allowDuplicates = this.config().allowDuplicates || false;

    if (!this.config().multiple && fileList.length > 1) {
      throw new Error('Multiple files not allowed');
    }

    if (currentFiles.length + fileList.length > maxFiles) {
      throw new Error(`Maximum ${maxFiles} files allowed`);
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const maxSize = (this.config().maxSize || 10) * 1024 * 1024;

      if (!allowDuplicates) {
        const isDuplicate = currentFiles.some(
          existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.type === file.type
        );

        if (isDuplicate) {
          console.warn(`File ${file.name} already exists, skipping...`);
          continue;
        }
      }

      if (file.size > maxSize) {
        throw new Error(`File ${file.name} exceeds maximum size of ${this.config().maxSize}MB`);
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        status: 'pending',
        progress: 0,
        loadingPreview: file.type.startsWith('image/')
      };

      newFiles.push(uploadedFile);
    }

    if (newFiles.length === 0 && fileList.length > 0) {
      throw new Error('All files are duplicates');
    }

    // Ajouter les fichiers AVANT de générer les previews
    this.files.update(current => [...current, ...newFiles]);

    // Générer les previews après l'ajout
    newFiles.forEach((uploadedFile, i) => {
      if (uploadedFile.file && uploadedFile.file.type.startsWith('image/')) {
        const actualIndex = currentFiles.length + i; // Index correct
        this.generatePreview(uploadedFile.file, actualIndex);
      }
    });

    return newFiles;
  }

  private generatePreview(file: File, index: number): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      this.files.update(current =>
        current.map((f, i) =>
          i === index
            ? { ...f, preview: e.target?.result as string, loadingPreview: false }
            : f
        )
      );
    };

    reader.onerror = () => {
      this.files.update(current =>
        current.map((f, i) =>
          i === index
            ? { ...f, loadingPreview: false }
            : f
        )
      );
    };

    reader.readAsDataURL(file);
  }

  removeFile(index: number): void {
    this.files.update(current => current.filter((_, i) => i !== index));
  }

  clearFiles(): void {
    this.files.set([]);
  }

  updateFileProgress(index: number, progress: number): void {
    this.files.update(current =>
      current.map((file, i) =>
        i === index ? { ...file, progress, status: 'uploading' as const } : file
      )
    );
  }

  updateFileStatus(index: number, status: UploadedFile['status'], error?: string, url?: string): void {
    this.files.update(current =>
      current.map((file, i) =>
        i === index ? { ...file, status, error, url, progress: status === 'success' ? 100 : file.progress } : file
      )
    );
  }

  getFiles(): UploadedFile[] {
    return this.files();
  }

  getFile(index: number): UploadedFile | undefined {
    return this.files()[index];
  }
}
