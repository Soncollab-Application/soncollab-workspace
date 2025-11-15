// projects/back-office/src/app/core/services/media/media.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MediaResponse,
  MediaFolderResponse,
  MediaSingleResponse,
  MediaSingleFolderResponse,
  BulkDeleteRequest,
  BulkDeleteResponse,
  CreateFolderRequest,
  CreateFolderResponse,
  UpdateFileRequest, BulkMoveRequest, BulkMoveResponse, FolderTreeNode, UpdateFolderRequest
} from '../../models/media/media-file.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.api.fullUrl}/media-library`;

  // ==================== FILES ====================

  getFiles(
    folderId: number | null,
    folderPath: string | undefined,
    page: number,
    pageSize: number,
    sort: string,
    search?: string
  ): Observable<MediaResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort', sort);

    if (search) {
      params = params.set('_q', search);
    } else if (folderPath) {
      params = params.set('filters[$and][0][folderPath][$eq]', folderPath);
    }

    return this.http.get<MediaResponse>(`${this.BASE_URL}/files`, { params });
  }

  getFile(documentId: string): Observable<MediaSingleResponse> {
    return this.http.get<MediaSingleResponse>(`${this.BASE_URL}/files/${documentId}`);
  }

  uploadFiles(files: File[], folderId?: string): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (folderId) formData.append('folderId', folderId);
    return this.http.post(`${this.BASE_URL}`, formData);
  }

  updateFile(documentId: string, data: UpdateFileRequest): Observable<MediaSingleResponse> {
    return this.http.put<MediaSingleResponse>(`${this.BASE_URL}/files/${documentId}`, data);
  }

  deleteFile(documentId: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/files/${documentId}`);
  }

  // ==================== FOLDERS ====================
  getFolders(parentFolderId: number | null, sort: string = 'name:ASC', search?: string): Observable<MediaFolderResponse> {
    let params = new HttpParams().set('sort', sort);

    if (parentFolderId) {
      params = params.set('filters[folder]', parentFolderId.toString());
    }

    if (search) {
      params = params.set('_q', search);
    }

    return this.http.get<MediaFolderResponse>(`${this.BASE_URL}/folders`, { params });
  }

  getFolder(documentId: string): Observable<MediaSingleFolderResponse> {
    return this.http.get<MediaSingleFolderResponse>(`${this.BASE_URL}/folders/${documentId}`);
  }

  createFolder(request: CreateFolderRequest): Observable<CreateFolderResponse> {
    return this.http.post<CreateFolderResponse>(`${this.BASE_URL}/folders`, request);
  }

  deleteFolder(documentId: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/folders/${documentId}`);
  }

  getFolderStructure(): Observable<{ data: FolderTreeNode[] }> {
    return this.http.get<{ data: FolderTreeNode[] }>(
      `${this.BASE_URL}/folder-structure`
    );
  }

  updateFolder(documentId: string, request: UpdateFolderRequest): Observable<MediaSingleFolderResponse> {
    return this.http.put<MediaSingleFolderResponse>(
      `${this.BASE_URL}/folders/${documentId}`,
      request
    );
  }

  // ==================== BULK ====================

  bulkDelete(request: BulkDeleteRequest): Observable<BulkDeleteResponse> {
    return this.http.post<BulkDeleteResponse>(`${this.BASE_URL}/actions/bulk-delete`, request);
  }

  bulkMove(request: BulkMoveRequest): Observable<BulkMoveResponse> {
    return this.http.post<BulkMoveResponse>(`${this.BASE_URL}/actions/bulk-move`, request);
  }
}
