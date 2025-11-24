import { Observable } from 'rxjs';

export interface UploadedFile {
  id?: number | string;
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
  file?: File;
  progress?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  loadingPreview?: boolean;
  metadata?: any;
}

export interface FileUploadConfig {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  autoUpload?: boolean;
  uploadUrl?: string;
  allowDuplicates?: boolean;
  customUploadFn?: (files: File[], context?: any) => Observable<any>;
  uploadContext?: any;
  responseTransformer?: (response: any) => UploadedFile[];
  validateDuplicateFn?: (file: File, existingFiles: UploadedFile[]) => boolean;
  filePreviewFn?: (file: UploadedFile) => string | null;
}
