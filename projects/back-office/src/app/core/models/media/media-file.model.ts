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
  id: number | string;
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
  sort?: string;

  folder?: string;
  folderPath?: string;

  mime?: 'image' | 'video' | 'document' | 'audio';
  search?: string;
  uploaded_by?: string;

  createdAt_eq?: string;
  createdAt_ne?: string;
  createdAt_gt?: string;
  createdAt_gte?: string;
  createdAt_lt?: string;
  createdAt_lte?: string;

  updatedAt_eq?: string;
  updatedAt_ne?: string;
  updatedAt_gt?: string;
  updatedAt_gte?: string;
  updatedAt_lt?: string;
  updatedAt_lte?: string;

  mime_contains?: string;
  mime_notContains?: string;
}

export type MediaFilterField = 'createdAt' | 'updatedAt' | 'type';
export type MediaFilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte';
export type MediaMimeOperator = 'contains' | 'notContains';
export type MediaMimeType = 'audio' | 'file' | 'image' | 'video';

export interface MediaAdvancedFilter {
  field: MediaFilterField;
  operator: MediaFilterOperator | MediaMimeOperator;
  value: string | MediaMimeType;
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
  parentId?: string;
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

export interface NavigationFolder {
  documentId: string;
  id: number | string;
  name: string;
  path: string;
  pathId: number;
  parent: any;
  createdAt: string;
  updatedAt: string;
  files: MediaFile[];
  children: MediaFolder[];
}

export interface DeleteFolderResponse {
  message: string;
  data: {
    documentId: string;
  };
}

export interface BulkDeleteFoldersResponse {
  message: string;
  data: {
    success: string[];
    errors: Array<{
      documentId: string;
      error: string;
    }>;
  };
}

export interface MediaItem {
  id: number | string;
  documentId: string;
  name: string;
  type: 'file' | 'folder';
  createdAt: string;
  updatedAt: string;

  mime?: string;
  size?: number;
  ext?: string;
  url?: string;
  formats?: MediaFormats | null;
  alternativeText?: string | null;
  uploaded_by?: MediaUploader;

  path?: string;
  pathId?: number;
  files?: MediaFolderFiles;
  children?: MediaFolder[];
  parent?: MediaFolder | null;
}
