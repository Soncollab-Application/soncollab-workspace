import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {BackofficeUser} from '../../models/auth.model';
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

}
