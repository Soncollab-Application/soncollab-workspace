import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserFilters, UserListItem, UsersListResponse } from '../../models/admin/user-list.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly ADMIN_ENDPOINTS = {
    users: `${this.API_URL}/users`,
    userById: (id: number) => `${this.API_URL}/users/${id}`,
    roles: `${this.API_URL}/users-permissions/roles`,
  };

  getUsers(
    page = 1,
    pageSize = 10,
    filters?: UserFilters,
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Observable<UsersListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString());

    // Mapper les champs de tri pour Strapi
    if (sortField) {
      const sortFieldMap: Record<string, string> = {
        'username': 'username',
        'email': 'email',
        'createdAt': 'createdAt',
        'role': 'role.name'
      };

      const mappedField = sortFieldMap[sortField] || sortField;
      params = params.set('sort[0]', `${mappedField}:${sortDirection}`);
    }

    // Recherche
    if (filters?.search) {
      params = params
        .set('filters[$or][0][username][$containsi]', filters.search)
        .set('filters[$or][1][email][$containsi]', filters.search)
        .set('filters[$or][2][first_name][$containsi]', filters.search)
        .set('filters[$or][3][last_name][$containsi]', filters.search);
    }

    // Filtre par rôle
    if (filters?.role) {
      params = params.set('filters[role][type][$eq]', filters.role);
    }

    // Filtre par blocked
    if (filters?.blocked !== undefined) {
      params = params.set('filters[blocked][$eq]', filters.blocked.toString());
    }

    // Filtre par confirmed
    if (filters?.confirmed !== undefined) {
      params = params.set('filters[confirmed][$eq]', filters.confirmed.toString());
    }

    return this.http.get<UsersListResponse>(this.ADMIN_ENDPOINTS.users, { params });
  }

  getRoles(): Observable<any> {
    return this.http.get(this.ADMIN_ENDPOINTS.roles);
  }

  updateUser(userId: number, data: Partial<UserListItem>): Observable<UserListItem> {
    return this.http.put<UserListItem>(this.ADMIN_ENDPOINTS.userById(userId), data);
  }

  blockUser(userId: number): Observable<UserListItem> {
    return this.updateUser(userId, { blocked: true });
  }

  unblockUser(userId: number): Observable<UserListItem> {
    return this.updateUser(userId, { blocked: false });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(this.ADMIN_ENDPOINTS.userById(userId));
  }
}
