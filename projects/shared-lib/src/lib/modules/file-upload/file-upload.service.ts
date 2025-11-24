import { Injectable } from '@angular/core';
import { signal, computed, Signal } from '@angular/core';
import { FileUploadConfig, UploadedFile } from './file-upload.model';

export interface FileUploadInstance {
  files: Signal<UploadedFile[]>;
  config: Signal<FileUploadConfig>;
  hasPendingFiles: Signal<boolean>;
  hasUploadingFiles: Signal<boolean>;
  hasSuccessFiles: Signal<boolean>;
  hasErrorFiles: Signal<boolean>;
  allFilesUploaded: Signal<boolean>;
  totalSize: Signal<number>;
  addFiles: (newFiles: UploadedFile[]) => { success: boolean; error?: string; max?: number; count?: number };
  removeFile: (index: number) => void;
  clearAll: () => void;
  clearUploaded: () => void;
  clearErrors: () => void;
  updateFileStatus: (index: number, status: UploadedFile['status'], progress?: number, error?: string, metadata?: any) => void;
  updateFileMetadata: (index: number, metadata: any) => void;
  setConfig: (newConfig: Partial<FileUploadConfig>) => void;
  getFileByName: (name: string) => UploadedFile | undefined;
  getFileByIndex: (index: number) => UploadedFile | undefined;
  reset: () => void;
}

@Injectable()
export class FileUploadService {

  createInstance(): FileUploadInstance {
    const files = signal<UploadedFile[]>([]);
    const config = signal<FileUploadConfig>({
      multiple: true,
      accept: 'image/*',
      maxSize: 10,
      maxFiles: 8,
      autoUpload: false,
      allowDuplicates: false
    });

    const hasPendingFiles = computed(() =>
      files().some(f => f.status === 'pending')
    );

    const hasUploadingFiles = computed(() =>
      files().some(f => f.status === 'uploading')
    );

    const hasSuccessFiles = computed(() =>
      files().some(f => f.status === 'success')
    );

    const hasErrorFiles = computed(() =>
      files().some(f => f.status === 'error')
    );

    const allFilesUploaded = computed(() => {
      const filesList = files();
      return filesList.length > 0 && filesList.every(f => f.status === 'success');
    });

    const totalSize = computed(() =>
      files().reduce((sum, file) => sum + file.size, 0)
    );

    const addFiles = (newFiles: UploadedFile[]): { success: boolean; error?: string; max?: number; count?: number } => {
      const currentConfig = config();

      if (!currentConfig.multiple && files().length > 0) {
        return { success: false, error: 'multipleNotAllowed' };
      }

      const totalFiles = files().length + newFiles.length;
      if (currentConfig.maxFiles && totalFiles > currentConfig.maxFiles) {
        return { success: false, error: 'maxFiles', max: currentConfig.maxFiles };
      }

      let filteredFiles = newFiles;
      if (!currentConfig.allowDuplicates) {
        if (currentConfig.validateDuplicateFn) {
          filteredFiles = newFiles.filter(newFile => {
            const file = newFile.file;
            if (!file) return true;
            return !currentConfig.validateDuplicateFn!(file, files());
          });
        } else {
          filteredFiles = newFiles.filter(newFile =>
            !files().some(f => f.name === newFile.name)
          );
        }
      }

      if (filteredFiles.length === 0) {
        return { success: false, error: 'duplicates' };
      }

      files.update(current => [...current, ...filteredFiles]);

      return { success: true, count: filteredFiles.length };
    };

    const removeFile = (index: number): void => {
      files.update(current => current.filter((_, i) => i !== index));
    };

    const clearAll = (): void => {
      files.set([]);
    };

    const clearUploaded = (): void => {
      files.update(current => current.filter(f => f.status !== 'success'));
    };

    const clearErrors = (): void => {
      files.update(current => current.filter(f => f.status !== 'error'));
    };

    const updateFileStatus = (
      index: number,
      status: UploadedFile['status'],
      progress?: number,
      error?: string,
      metadata?: any
    ): void => {
      files.update(current =>
        current.map((f, i) =>
          i === index
            ? {
              ...f,
              status,
              progress: progress !== undefined ? progress : f.progress,
              error: error !== undefined ? error : f.error,
              metadata: metadata !== undefined ? { ...f.metadata, ...metadata } : f.metadata
            }
            : f
        )
      );
    };

    const updateFileMetadata = (index: number, metadata: any): void => {
      files.update(current =>
        current.map((f, i) =>
          i === index
            ? { ...f, metadata: { ...f.metadata, ...metadata } }
            : f
        )
      );
    };

    const setConfig = (newConfig: Partial<FileUploadConfig>): void => {
      config.update(current => ({ ...current, ...newConfig }));
    };

    const getFileByName = (name: string): UploadedFile | undefined => {
      return files().find(f => f.name === name);
    };

    const getFileByIndex = (index: number): UploadedFile | undefined => {
      return files()[index];
    };

    const reset = (): void => {
      files.set([]);
      config.set({
        multiple: true,
        accept: 'image/*',
        maxSize: 10,
        maxFiles: 8,
        autoUpload: false,
        allowDuplicates: false
      });
    };

    return {
      files: files.asReadonly(),
      config: config.asReadonly(),
      hasPendingFiles,
      hasUploadingFiles,
      hasSuccessFiles,
      hasErrorFiles,
      allFilesUploaded,
      totalSize,
      addFiles,
      removeFile,
      clearAll,
      clearUploaded,
      clearErrors,
      updateFileStatus,
      updateFileMetadata,
      setConfig,
      getFileByName,
      getFileByIndex,
      reset
    };
  }

  validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize * 1024 * 1024;
  }

  validateFileType(file: File, accept: string): boolean {
    if (!accept || accept === '*/*') return true;

    const acceptedTypes = accept.split(',').map(type => type.trim());

    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }

      if (type.endsWith('/*')) {
        const mimeType = type.split('/')[0];
        return file.type.startsWith(mimeType + '/');
      }

      return file.type === type;
    });
  }

  async generatePreview(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };

      reader.onerror = () => {
        resolve(null);
      };

      reader.readAsDataURL(file);
    });
  }

  async generateVideoPreview(file: File): Promise<string | null> {
    if (!file.type.startsWith('video/')) {
      return null;
    }

    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = 1;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);

        const preview = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(preview);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);

    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  isImage(file: File | UploadedFile): boolean {
    const type = 'file' in file && file.file ? file.file.type : file.type;
    return type.startsWith('image/');
  }

  isVideo(file: File | UploadedFile): boolean {
    const type = 'file' in file && file.file ? file.file.type : file.type;
    return type.startsWith('video/');
  }

  isAudio(file: File | UploadedFile): boolean {
    const type = 'file' in file && file.file ? file.file.type : file.type;
    return type.startsWith('audio/');
  }

  isPDF(file: File | UploadedFile): boolean {
    const type = 'file' in file && file.file ? file.file.type : file.type;
    return type === 'application/pdf';
  }
}
