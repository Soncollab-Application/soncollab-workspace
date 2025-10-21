import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {UserFilters, UserListItem, UsersListResponse, UserStats} from '../../models/admin/user-list.model';
import { Observable } from 'rxjs';
import {
  Country,
  InvitationListItem,
  InvitationListResponse,
  InvitationStats,
  InviteRequest, RolesResponse, Territory
} from '../../models/admin/invitation.model';
import {TranslateService} from '@ngx-translate/core';
import {CustomPermissions} from '../../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private readonly API_URL = environment.api.fullUrl;

  private readonly ADMIN_ENDPOINTS = {
    // Users
    users: `${this.API_URL}/users`,
    userByDocumentId: (documentId: string) => `${this.API_URL}/users/${documentId}`,
    roles: `${this.API_URL}/users-permissions/roles`,
    user_stats:`${this.API_URL}/soncollab-users/stats`,

    // Countries & Territories
    countries: `${this.API_URL}/countries`,
    territories: `${this.API_URL}/sales-territories`,

    // Invitations
    invitations:`${this.API_URL}/soncollab-invitations`,
    invitations_pending:`${this.API_URL}/soncollab-invitations/pending`,
    invitations_stats: `${this.API_URL}/soncollab-invitations/stats`,
    invitations_roles: `${this.API_URL}/soncollab-invitations/roles`,
    invitations_invite: `${this.API_URL}/soncollab-invitations/invite`,
    invitations_by_id: (documentId: string) => `${this.API_URL}/soncollab-invitations/${documentId}`,
    invitations_resend: (documentId: string) => `${this.API_URL}/soncollab-invitations/${documentId}/resend`,
    invitations_cancel: (documentId: string) => `${this.API_URL}/soncollab-invitations/${documentId}/cancel`,
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

    if (filters?.search) {
      const searchTerms = filters.search.trim().split(' ').filter(term => term.length > 0);

      if (searchTerms.length === 1) {
        params = params.set('filters[$or][0][username][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][1][email][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][2][first_name][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][3][last_name][$containsi]', searchTerms[0]);
      } else if (searchTerms.length === 2) {
        params = params.set('filters[$or][0][$and][0][first_name][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][0][$and][1][last_name][$containsi]', searchTerms[1]);

        params = params.set('filters[$or][1][$and][0][first_name][$containsi]', searchTerms[1]);
        params = params.set('filters[$or][1][$and][1][last_name][$containsi]', searchTerms[0]);

        params = params.set('filters[$or][2][username][$containsi]', filters.search);
        params = params.set('filters[$or][3][email][$containsi]', filters.search);
      } else {
        params = params.set('filters[$or][0][username][$containsi]', filters.search);
        params = params.set('filters[$or][1][email][$containsi]', filters.search);
      }
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

  getUserStats(): Observable<{ data: UserStats }> {
    return this.http.get<{ data: UserStats }>(this.ADMIN_ENDPOINTS.user_stats);
  }


  getInvitations(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    role?: string;
    search?: string;
    sort?: string;
  }): Observable<InvitationListResponse> {
    let httpParams = new HttpParams();

    if (params?.page) httpParams = httpParams.set('pagination[page]', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pagination[pageSize]', params.pageSize.toString());
    if (params?.status) httpParams = httpParams.set('filters[invitation_status][$eq]', params.status);
    if (params?.role) httpParams = httpParams.set('filters[target_role][$eq]', params.role);
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);

    if (params?.search) {
      const searchTerms = params.search.trim().split(' ').filter(term => term.length > 0);

      if (searchTerms.length === 1) {
        httpParams = httpParams.set('filters[$or][0][email][$containsi]', searchTerms[0]);
        httpParams = httpParams.set('filters[$or][1][first_name][$containsi]', searchTerms[0]);
        httpParams = httpParams.set('filters[$or][2][last_name][$containsi]', searchTerms[0]);
      } else if (searchTerms.length === 2) {

        httpParams = httpParams.set('filters[$or][0][$and][0][first_name][$containsi]', searchTerms[0]);
        httpParams = httpParams.set('filters[$or][0][$and][1][last_name][$containsi]', searchTerms[1]);

        httpParams = httpParams.set('filters[$or][1][$and][0][first_name][$containsi]', searchTerms[1]);
        httpParams = httpParams.set('filters[$or][1][$and][1][last_name][$containsi]', searchTerms[0]);

        httpParams = httpParams.set('filters[$or][2][email][$containsi]', params.search);
      } else {
        httpParams = httpParams.set('filters[email][$containsi]', params.search);
      }
    }

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<InvitationListResponse>(this.ADMIN_ENDPOINTS.invitations, { params: httpParams }
    );
  }

  getInvitationById(documentId: string): Observable<{ data: InvitationListItem }> {
    let httpParams = new HttpParams();

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<{ data: InvitationListItem }>(this.ADMIN_ENDPOINTS.invitations_by_id(documentId),
      { params: httpParams }
    );
  }

  getPendingInvitations(): Observable<{ data: InvitationListItem[] }> {
    let httpParams = new HttpParams();

    httpParams = httpParams.set('populate[0]', 'invited_by');
    httpParams = httpParams.set('populate[1]', 'territory');
    httpParams = httpParams.set('populate[2]', 'target_country');
    httpParams = httpParams.set('populate[3]', 'invited_user');

    return this.http.get<{ data: InvitationListItem[] }>(this.ADMIN_ENDPOINTS.invitations_pending,
      { params: httpParams }
    );
  }

  getInvitationStats(): Observable<{ data: InvitationStats }> {
    return this.http.get<{ data: InvitationStats }>(
      this.ADMIN_ENDPOINTS.invitations_stats
    );
  }

  getAvailableRoles(lang?: string): Observable<RolesResponse> {
    const language = lang || this.translate.currentLang || 'fr';
    return this.http.get<RolesResponse>(this.ADMIN_ENDPOINTS.invitations_roles,
      { params: { lang: language } }
    );
  }

  inviteMember(data: InviteRequest): Observable<{ data: InvitationListItem }> {
    return this.http.post<{ data: InvitationListItem }>(
      this.ADMIN_ENDPOINTS.invitations_invite,
      data
    );
  }

  resendInvitation(documentId: string): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      this.ADMIN_ENDPOINTS.invitations_resend(documentId),
      {}
    );
  }

  cancelInvitation(documentId: string): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      this.ADMIN_ENDPOINTS.invitations_cancel(documentId),
      {}
    );
  }

  updateInvitation(documentId: string, data: Partial<InviteRequest>): Observable<{ data: InvitationListItem }> {
    return this.http.put<{ data: InvitationListItem }>(
      this.ADMIN_ENDPOINTS.invitations_by_id(documentId),
      { data }
    );
  }

  deleteInvitation(documentId: string): Observable<void> {
    return this.http.delete<void>(
      this.ADMIN_ENDPOINTS.invitations_by_id(documentId)
    );
  }

  getCountries(): Observable<{ data: Country[] }> {
    let params = new HttpParams();
    params = params.set('populate', 'sales_territory');
    params = params.set('pagination[limit]', 300);

    return this.http.get<{ data: Country[] }>(
      this.ADMIN_ENDPOINTS.countries,
      { params }
    );
  }

  getTerritories(): Observable<{ data: Territory[] }> {
    return this.http.get<{ data: Territory[] }>(
      this.ADMIN_ENDPOINTS.territories
    );
  }

}
