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
  MediaFolderCreateResponse
} from '../../models/media/media-file.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly MEDIA_ENDPOINTS = {
    files: `${this.API_URL}/media-library/files`,
    fileById: (documentId: string) => `${this.API_URL}/media-library/files/${documentId}`,
    upload: `${this.API_URL}/media-library/upload`,
    bulkDelete: `${this.API_URL}/media-library/files/bulk-delete`,
    folders: `${this.API_URL}/media-library/folders`,
    folderById: (documentId: string) => `${this.API_URL}/media-library/folders/${documentId}`,
    stats: `${this.API_URL}/media-library/stats`,
    search: `${this.API_URL}/media-library/search`,
    recent: `${this.API_URL}/media-library/recent`,
  };

  /**
   * Liste paginée des fichiers avec filtres
   */
  getFiles(filters?: MediaFilters): Observable<MediaFilesResponse> {
    let params = new HttpParams();

    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }

    if (filters?.pageSize) {
      params = params.set('pageSize', filters.pageSize.toString());
    }

    if (filters?.mime) {
      params = params.set('mime', filters.mime);
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    if (filters?.uploaded_by) {
      params = params.set('uploaded_by', filters.uploaded_by);
    }

    return this.http.get<MediaFilesResponse>(this.MEDIA_ENDPOINTS.files, { params });
  }

  /**
   * Détails d'un fichier spécifique
   */
  getFileById(documentId: string): Observable<MediaFileResponse> {
    return this.http.get<MediaFileResponse>(this.MEDIA_ENDPOINTS.fileById(documentId));
  }

  /**
   * Upload un ou plusieurs fichiers
   */
  uploadFiles(files: File[]): Observable<MediaUploadResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<MediaUploadResponse>(this.MEDIA_ENDPOINTS.upload, formData);
  }

  /**
   * Mettre à jour les métadonnées d'un fichier
   */
  updateFile(documentId: string, data: MediaUpdateRequest): Observable<MediaFileResponse> {
    return this.http.put<MediaFileResponse>(this.MEDIA_ENDPOINTS.fileById(documentId), data);
  }

  /**
   * Supprimer un fichier
   */
  deleteFile(documentId: string): Observable<MediaDeleteResponse> {
    return this.http.delete<MediaDeleteResponse>(this.MEDIA_ENDPOINTS.fileById(documentId));
  }

  /**
   * Supprimer plusieurs fichiers en une fois
   */
  bulkDeleteFiles(documentIds: string[]): Observable<MediaBulkDeleteResponse> {
    const body: MediaBulkDeleteRequest = { documentIds };
    return this.http.post<MediaBulkDeleteResponse>(this.MEDIA_ENDPOINTS.bulkDelete, body);
  }

  /**
   * Liste des dossiers accessibles
   */
  getFolders(): Observable<MediaFoldersResponse> {
    return this.http.get<MediaFoldersResponse>(this.MEDIA_ENDPOINTS.folders);
  }

  /**
   * Contenu d'un dossier spécifique
   */
  getFolderById(documentId: string): Observable<MediaFolderResponse> {
    return this.http.get<MediaFolderResponse>(this.MEDIA_ENDPOINTS.folderById(documentId));
  }

  /**
   * Créer un nouveau dossier
   */
  createFolder(data: MediaFolderCreateRequest): Observable<MediaFolderCreateResponse> {
    return this.http.post<MediaFolderCreateResponse>(this.MEDIA_ENDPOINTS.folders, data);
  }

  /**
   * Statistiques sur les fichiers
   */
  getStats(): Observable<MediaStatsResponse> {
    return this.http.get<MediaStatsResponse>(this.MEDIA_ENDPOINTS.stats);
  }

  /**
   * Recherche avancée dans les fichiers
   */
  searchFiles(request: MediaSearchRequest): Observable<MediaFilesResponse> {
    return this.http.post<MediaFilesResponse>(this.MEDIA_ENDPOINTS.search, request);
  }

  /**
   * Fichiers récemment uploadés
   */
  getRecentFiles(limit: number = 10): Observable<MediaFilesResponse> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<MediaFilesResponse>(this.MEDIA_ENDPOINTS.recent, { params });
  }
}
