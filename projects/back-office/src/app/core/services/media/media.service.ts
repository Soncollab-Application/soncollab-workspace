import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MediaFile,
  MediaFilesResponse,
  MediaFileResponse,
  MediaUploadResponse,
  MediaFoldersResponse,
  MediaFolderResponse,
  MediaStatsResponse,
  MediaFilters,
  MediaSearchRequest,
  MediaUpdateRequest,
  MediaFolderCreateRequest,
  MediaBulkDeleteRequest,
  MediaBulkDeleteResponse,
  MediaDeleteResponse,
  MediaFolderCreateResponse,
  DeleteFolderResponse,
  BulkDeleteFoldersResponse,
  MediaAdvancedFilter,
  MediaMimeType
} from '../../models/media/media-file.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly MEDIA_ENDPOINTS = {
    files: `${this.API_URL}/media-library/files`,
    fileById: (documentId: string) => `${this.API_URL}/media-library/files/${documentId}`,
    upload: `${this.API_URL}/media-library`,
    bulkDelete: `${this.API_URL}/media-library/actions/bulk-delete`,
    folders: `${this.API_URL}/media-library/folders`,
    folderById: (documentId: string) => `${this.API_URL}/media-library/folders/${documentId}`,
    folderDelete: (documentId: string) => `${this.API_URL}/media-library/folders/${documentId}`,
    bulkDeleteFolder: `${this.API_URL}/media-library/actions/bulk-delete`,
    bulkMove: `${this.API_URL}/media-library/actions/bulk-move`,
    stats: `${this.API_URL}/media-library/stats`,
  };

  getFiles(filters?: MediaFilters): Observable<MediaFilesResponse> {
    let params = new HttpParams();

    if (filters?.page) {
      params = params.set('pagination[page]', filters.page.toString());
    }

    if (filters?.pageSize) {
      params = params.set('pagination[pageSize]', filters.pageSize.toString());
    }

    if (filters?.sort) {
      params = params.set('sort', filters.sort);
    }

    if (filters?.folder) {
      params = params.set('folder', filters.folder);
    }

    if (filters?.folderPath) {
      params = params.set('filters[$and][0][folderPath][$eq]', filters.folderPath);
    }

    if (filters?.search) {
      params = params.set('_q', filters.search);
    }

    if (filters?.mime) {
      params = params.set('mime', filters.mime);
    }

    if (filters?.uploaded_by) {
      params = params.set('uploaded_by', filters.uploaded_by);
    }

    if (filters?.createdAt_eq) {
      params = params.set('filters[$and][0][createdAt][$eq]', filters.createdAt_eq);
    }
    if (filters?.createdAt_ne) {
      params = params.set('filters[$and][0][createdAt][$ne]', filters.createdAt_ne);
    }
    if (filters?.createdAt_gt) {
      params = params.set('filters[$and][0][createdAt][$gt]', filters.createdAt_gt);
    }
    if (filters?.createdAt_gte) {
      params = params.set('filters[$and][0][createdAt][$gte]', filters.createdAt_gte);
    }
    if (filters?.createdAt_lt) {
      params = params.set('filters[$and][0][createdAt][$lt]', filters.createdAt_lt);
    }
    if (filters?.createdAt_lte) {
      params = params.set('filters[$and][0][createdAt][$lte]', filters.createdAt_lte);
    }

    if (filters?.updatedAt_eq) {
      params = params.set('filters[$and][1][updatedAt][$eq]', filters.updatedAt_eq);
    }
    if (filters?.updatedAt_ne) {
      params = params.set('filters[$and][1][updatedAt][$ne]', filters.updatedAt_ne);
    }
    if (filters?.updatedAt_gt) {
      params = params.set('filters[$and][1][updatedAt][$gt]', filters.updatedAt_gt);
    }
    if (filters?.updatedAt_gte) {
      params = params.set('filters[$and][1][updatedAt][$gte]', filters.updatedAt_gte);
    }
    if (filters?.updatedAt_lt) {
      params = params.set('filters[$and][1][updatedAt][$lt]', filters.updatedAt_lt);
    }
    if (filters?.updatedAt_lte) {
      params = params.set('filters[$and][1][updatedAt][$lte]', filters.updatedAt_lte);
    }

    if (filters?.mime_contains) {
      params = params.set('filters[$and][0][mime][$contains]', filters.mime_contains);
    }
    if (filters?.mime_notContains) {
      params = params.set('filters[$and][0][mime][$notContains]', filters.mime_notContains);
    }

    return this.http.get<MediaFilesResponse>(this.MEDIA_ENDPOINTS.files, { params });
  }

  getFileById(documentId: string): Observable<MediaFileResponse> {
    return this.http.get<MediaFileResponse>(this.MEDIA_ENDPOINTS.fileById(documentId));
  }

  uploadFiles(files: File[], folderId?: string): Observable<MediaUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    if (folderId) {
      formData.append('folderId', folderId);
    }

    return this.http.post<MediaUploadResponse>(this.MEDIA_ENDPOINTS.upload, formData);
  }

  updateFile(documentId: string, data: MediaUpdateRequest): Observable<MediaFileResponse> {
    return this.http.put<MediaFileResponse>(this.MEDIA_ENDPOINTS.fileById(documentId), data);
  }

  deleteFile(documentId: string): Observable<MediaDeleteResponse> {
    return this.http.delete<MediaDeleteResponse>(this.MEDIA_ENDPOINTS.fileById(documentId));
  }

  bulkDeleteFiles(fileIds: string[], folderIds: string[] = []): Observable<MediaBulkDeleteResponse> {
    const body = { fileIds, folderIds };
    return this.http.post<MediaBulkDeleteResponse>(this.MEDIA_ENDPOINTS.bulkDelete, body);
  }

  bulkMoveFiles(fileIds: string[], destinationFolderId: string): Observable<any> {
    const body = { fileIds, destinationFolderId };
    return this.http.post(this.MEDIA_ENDPOINTS.bulkMove, body);
  }

  getFolders(): Observable<MediaFoldersResponse> {
    return this.http.get<MediaFoldersResponse>(this.MEDIA_ENDPOINTS.folders);
  }

  deleteFolder(documentId: string): Observable<DeleteFolderResponse> {
    return this.http.delete<DeleteFolderResponse>(this.MEDIA_ENDPOINTS.folderDelete(documentId));
  }

  bulkDeleteFolders(folderIds: string[]): Observable<BulkDeleteFoldersResponse> {
    return this.http.post<BulkDeleteFoldersResponse>(this.MEDIA_ENDPOINTS.bulkDeleteFolder, { folderIds });
  }

  getFolderById(documentId: string): Observable<MediaFolderResponse> {
    return this.http.get<MediaFolderResponse>(this.MEDIA_ENDPOINTS.folderById(documentId));
  }

  createFolder(data: MediaFolderCreateRequest): Observable<MediaFolderCreateResponse> {
    return this.http.post<MediaFolderCreateResponse>(this.MEDIA_ENDPOINTS.folders, data);
  }

  getStats(): Observable<MediaStatsResponse> {
    return this.http.get<MediaStatsResponse>(this.MEDIA_ENDPOINTS.stats);
  }

  buildAdvancedFilters(advancedFilters: MediaAdvancedFilter[]): Partial<MediaFilters> {
    const filters: Partial<MediaFilters> = {};

    advancedFilters.forEach((filter) => {
      if (filter.field === 'type') {
        if (filter.operator === 'contains') {
          filters.mime_contains = this.mapMimeType(filter.value as MediaMimeType);
        } else if (filter.operator === 'notContains') {
          filters.mime_notContains = this.mapMimeType(filter.value as MediaMimeType);
        }
      } else {
        const field = filter.field;
        const key = `${field}_${filter.operator}` as keyof MediaFilters;
        (filters as any)[key] = filter.value;
      }
    });

    return filters;
  }

  private mapMimeType(type: MediaMimeType): string {
    const mimeMap: Record<MediaMimeType, string> = {
      audio: 'audio',
      file: 'application',
      image: 'image',
      video: 'video'
    };
    return mimeMap[type];
  }
}
