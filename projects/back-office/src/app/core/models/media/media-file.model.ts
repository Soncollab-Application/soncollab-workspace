// projects/back-office/src/app/core/models/media/media-file.model.ts

export interface MediaFile {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: MediaFormats | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string | null;
  provider: string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  uploaded_by: MediaUploader;
  folder?: MediaFolder | null;
  type?: 'asset';
  isSelectable?: boolean;
}

export interface MediaFormats {
  thumbnail?: MediaFormat;
  small?: MediaFormat;
  medium?: MediaFormat;
  large?: MediaFormat;
}

export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
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
  parent?: MediaFolder | null;
  children?: MediaFolder[];
  files?: { count: number };
  type?: 'folder';
  folderURL?: string;
  isSelectable?: boolean;
}

export interface MediaResponse {
  data: MediaFile[];
  meta: { pagination: MediaPagination };
}

export interface MediaFolderResponse {
  data: MediaFolder[];
}

export interface MediaSingleResponse {
  data: MediaFile;
}

export interface MediaSingleFolderResponse {
  data: MediaFolder;
}

export interface MediaPagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface BulkDeleteRequest {
  fileIds: string[];
  folderIds: string[];
}

export interface BulkDeleteResponse {
  message: string;
  data: {
    files: { success: string[]; errors: Array<{ documentId: string; error: string }> };
    folders: { success: string[]; errors: Array<{ documentId: string; error: string }> };
  };
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface CreateFolderResponse {
  message: string;
  data: MediaFolder;
}

export interface UpdateFileRequest {
  name?: string;
  alternativeText?: string;
  caption?: string;
}

export interface BulkMoveRequest {
  fileIds: string[];
  folderIds: string[];
  destinationFolderId?: string;
}

export interface BulkMoveResponse {
  message: string;
  data: {
    success: string[];
    errors: Array<{ documentId: string; error: string }>;
  };
}

export interface FolderTreeNode {
  value: string | null;
  label: string;
  path?: string;
  children?: FolderTreeNode[];
}

export interface UpdateFolderRequest {
  name: string;
}

export type SortOption = 'createdAt:DESC' | 'createdAt:ASC' | 'name:ASC' | 'name:DESC' | 'updatedAt:DESC' | 'updatedAt:ASC';
export type ViewMode = 'grid' | 'list';
export const DEFAULT_PAGE_SIZE = 10;
