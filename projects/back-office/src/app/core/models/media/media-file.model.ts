import { BackofficeUser } from '../auth.model';

export interface MediaFile {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: MediaFormats | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: Record<string, any> | null;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string | null;
  uploaded_by: MediaUploader;
  folder: MediaFolder;
  related?: any[];
}

export interface MediaFormats {
  thumbnail?: MediaThumbnail;
  small?: MediaThumbnail;
  medium?: MediaThumbnail;
  large?: MediaThumbnail;
}

export interface MediaThumbnail {
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface MediaUploader {
  id: number;
  documentId: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface MediaFolder {
  id: number;
  documentId: string;
  name: string;
  pathId: number;
  path: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string | null;
  parent: MediaFolder | null;
  files?: MediaFolderFiles;
  children?: MediaFolder[];
}

export interface MediaFolderFiles {
  count: number;
}

export interface MediaFilesResponse {
  data: MediaFile[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface MediaFileResponse {
  data: MediaFile;
}

export interface MediaUploadResponse {
  data: MediaFile[];
  meta: {
    count: number;
  };
}

export interface MediaFoldersResponse {
  data: MediaFolder[];
}

export interface MediaFolderResponse {
  data: MediaFolder;
}

export interface MediaStats {
  total: {
    files: number;
    size: number;
    sizeFormatted: string;
  };
  byType: {
    images: number;
    videos: number;
    documents: number;
    others: number;
  };
  byUser: MediaUserStats[] | null;
}

export interface MediaUserStats {
  user: {
    documentId: string;
    email: string;
    role: string;
    name: string;
  };
  totalFiles: number;
  totalSize: number;
  sizeFormatted: string;
}

export interface MediaStatsResponse {
  data: MediaStats;
}

export interface MediaFilters {
  page?: number;
  pageSize?: number;
  mime?: 'image' | 'video' | 'document' | 'audio';
  search?: string;
  uploaded_by?: string;
}

export interface MediaSearchRequest {
  query?: string;
  filters?: {
    mime?: 'image' | 'video' | 'document' | 'audio';
    uploaded_by?: string;
  };
  pagination?: {
    page?: number;
    pageSize?: number;
  };
}

export interface MediaUpdateRequest {
  name?: string;
  alternativeText?: string;
  caption?: string;
}

export interface MediaFolderCreateRequest {
  name: string;
  parentPath?: string;
}

export interface MediaBulkDeleteRequest {
  documentIds: string[];
}

export interface MediaBulkDeleteResponse {
  message: string;
  data: {
    success: string[];
    errors: Array<{
      documentId: string;
      error: string;
    }>;
  };
}

export interface MediaDeleteResponse {
  message: string;
  data: {
    documentId: string;
  };
}

export interface MediaFolderCreateResponse {
  message: string;
  data: {
    id: number;
    documentId?: string;
    name?: string;
    path?: string;
    pathId?: number;
  };
}
