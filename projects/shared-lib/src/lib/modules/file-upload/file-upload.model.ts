export interface UploadedFile {
  id?: number;
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
}

export interface FileUploadConfig {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  autoUpload?: boolean;
  uploadUrl?: string;
  allowDuplicates?: boolean;
}
