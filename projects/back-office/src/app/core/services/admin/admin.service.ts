import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import {BackofficeUser} from '../../models/auth.model';
import {
  CreateUserRequest,
  GetUsersRequest,
  SearchUsersRequest, SearchUsersResponse,
  UpdateUserRequest
} from '../../models/admin/user-management.model';
import {environment} from '../../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly ADMIN_ENDPOINTS = {
    users: `${this.API_URL}/users`,
    userById: (documentId: string) => `${this.API_URL}/users/${documentId}`,
    roles: `${this.API_URL}/users-permissions/roles`,
  };

  private usersCache = signal<BackofficeUser[]>([]);

  getUsers(request?: GetUsersRequest): Observable<BackofficeUser[]> {
    let params = new HttpParams();

    if (request?.page) {
      params = params.set('pagination[page]', request.page.toString());
    }
    if (request?.pageSize) {
      params = params.set('pagination[pageSize]', request.pageSize.toString());
    }
    if (request?.sortBy) {
      const order = request.sortOrder === 'desc' ? 'desc' : 'asc';
      params = params.set('sort', `${request.sortBy}:${order}`);
    }
    if (request?.filters) {
      Object.entries(request.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'boolean') {
            params = params.set(`filters[${key}][$eq]`, value.toString());
          } else {
            params = params.set(`filters[${key}][$containsi]`, value.toString());
          }
        }
      });
    }

    return this.http.get<BackofficeUser[]>(this.ADMIN_ENDPOINTS.users, { params }).pipe(
      tap(users => this.usersCache.set(users)),
      catchError(error => {
        console.error('Erreur chargement users:', error);
        return of([]);
      })
    );
  }

  getUserById(documentId: string): Observable<BackofficeUser> {
    return this.http.get<BackofficeUser>(this.ADMIN_ENDPOINTS.userById(documentId)).pipe(
      catchError(error => {
        console.error(`Erreur user ${documentId}:`, error);
        throw error;
      })
    );
  }

  createUser(request: CreateUserRequest): Observable<BackofficeUser> {
    return this.http.post<BackofficeUser>(this.ADMIN_ENDPOINTS.users, request).pipe(
      tap(user => {
        this.usersCache.update(users => [...users, user]);
      }),
      catchError(error => {
        console.error('Erreur création:', error);
        throw error;
      })
    );
  }

  updateUser(documentId: string, request: UpdateUserRequest): Observable<BackofficeUser> {
    return this.http.put<BackofficeUser>(
      this.ADMIN_ENDPOINTS.userById(documentId),
      request
    ).pipe(
      tap(user => {
        this.usersCache.update(users =>
          users.map(u => u.documentId === documentId ? user : u)
        );
      }),
      catchError(error => {
        console.error(`Erreur update user ${documentId}:`, error);
        throw error;
      })
    );
  }

  deleteUser(documentId: string): Observable<void> {
    return this.http.delete<void>(this.ADMIN_ENDPOINTS.userById(documentId)).pipe(
      tap(() => {
        this.usersCache.update(users => users.filter(u => u.documentId !== documentId));
      }),
      catchError(error => {
        console.error(`Erreur suppression user ${documentId}:`, error);
        throw error;
      })
    );
  }

  blockUser(documentId: string): Observable<BackofficeUser> {
    return this.updateUser(documentId, { blocked: true });
  }

  unblockUser(documentId: string): Observable<BackofficeUser> {
    return this.updateUser(documentId, { blocked: false });
  }

  searchUsers(request: SearchUsersRequest): Observable<SearchUsersResponse> {
    let params = new HttpParams();

    const fields = request.fields || ['username', 'email', 'first_name', 'last_name'];

    // Recherche avec Strapi filter syntax
    fields.forEach(field => {
      params = params.set(`filters[${field}][$containsi]`, request.query);
    });

    if (request.limit) {
      params = params.set('pagination[pageSize]', request.limit.toString());
    }

    return this.http.get<BackofficeUser[]>(this.ADMIN_ENDPOINTS.users, { params }).pipe(
      map(users => ({
        results: users,
        total: users.length
      })),
      catchError(error => {
        console.error('Erreur recherche:', error);
        return of({ results: [], total: 0 });
      })
    );
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(this.ADMIN_ENDPOINTS.roles).pipe(
      catchError(error => {
        console.error('Erreur chargement rôles:', error);
        return of([]);
      })
    );
  }

  getUsersCache() {
    return this.usersCache.asReadonly();
  }

  clearCache() {
    this.usersCache.set([]);
  }
}
