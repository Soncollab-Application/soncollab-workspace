import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserFilters, UserListItem, UsersListResponse } from '../../models/admin/user-list.model';
import { Observable } from 'rxjs';
import {
  InvitationListItem,
  InvitationListResponse,
  InvitationStats,
  InviteRequest,
  RoleInfo
} from '../../models/admin/invitation.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly ADMIN_ENDPOINTS = {
    // Users
    users: `${this.API_URL}/users`,
    userByDocumentId: (documentId: string) => `${this.API_URL}/users/${documentId}`,
    roles: `${this.API_URL}/users-permissions/roles`,

    // Invitations
    invitations: '/soncollab-invitations',
    invitations_pending: '/soncollab-invitations/pending',
    invitations_stats: '/soncollab-invitations/stats',
    invitations_roles: '/soncollab-invitations/roles',
    invitations_invite: '/soncollab-invitations/invite',
    invitations_by_id: (documentId: string) => `/soncollab-invitations/${documentId}`,
    invitations_resend: (documentId: string) => `/soncollab-invitations/${documentId}/resend`,
    invitations_cancel: (documentId: string) => `/soncollab-invitations/${documentId}/cancel`,
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

  getUserByDocumentId(documentId: string): Observable<UserListItem> {
    return this.http.get<UserListItem>(this.ADMIN_ENDPOINTS.userByDocumentId(documentId));
  }

  updateUser(documentId: string, data: Partial<UserListItem>): Observable<UserListItem> {
    return this.http.put<UserListItem>(this.ADMIN_ENDPOINTS.userByDocumentId(documentId), data);
  }

  blockUser(documentId: string): Observable<UserListItem> {
    return this.updateUser(documentId, { blocked: true });
  }

  unblockUser(documentId: string): Observable<UserListItem> {
    return this.updateUser(documentId, { blocked: false });
  }


  deleteUser(documentId: string): Observable<void> {
    return this.http.delete<void>(this.ADMIN_ENDPOINTS.userByDocumentId(documentId));
  }


  getInvitations(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    role?: string;
    sort?: string;
  }): Observable<InvitationListResponse> {
    let httpParams = new HttpParams();

    if (params?.page) httpParams = httpParams.set('pagination[page]', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pagination[pageSize]', params.pageSize.toString());
    if (params?.status) httpParams = httpParams.set('filters[invitation_status][$eq]', params.status);
    if (params?.role) httpParams = httpParams.set('filters[target_role][$eq]', params.role);
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<InvitationListResponse>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations}`,
      { params: httpParams }
    );
  }

  getInvitationById(documentId: string): Observable<{ data: InvitationListItem }> {
    let httpParams = new HttpParams();

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<{ data: InvitationListItem }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_by_id(documentId)}`,
      { params: httpParams }
    );
  }

  getPendingInvitations(): Observable<{ data: InvitationListItem[] }> {
    let httpParams = new HttpParams();

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<{ data: InvitationListItem[] }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_pending}`,
      { params: httpParams }
    );
  }

  getInvitationStats(): Observable<InvitationStats> {
    return this.http.get<InvitationStats>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_stats}`
    );
  }

  getAvailableRoles(): Observable<{ data: RoleInfo[] }> {
    return this.http.get<{ data: RoleInfo[] }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_roles}`
    );
  }

  inviteMember(data: InviteRequest): Observable<{ data: InvitationListItem }> {
    return this.http.post<{ data: InvitationListItem }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_invite}`,
      data
    );
  }

  resendInvitation(documentId: string): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_resend(documentId)}`,
      {}
    );
  }

  cancelInvitation(documentId: string): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_cancel(documentId)}`,
      {}
    );
  }

  updateInvitation(documentId: string, data: Partial<InviteRequest>): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_by_id(documentId)}`,
      { data }
    );
  }

  deleteInvitation(documentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}${this.ADMIN_ENDPOINTS.invitations_by_id(documentId)}`
    );
  }


}
