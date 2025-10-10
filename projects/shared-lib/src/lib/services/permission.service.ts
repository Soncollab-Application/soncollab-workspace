import {computed, inject, Injectable, signal} from '@angular/core';
import {catchError, Observable, of, tap} from 'rxjs';
import {PermissionsConfig, RolePermissionsResponse} from '../models';
import {HttpClient} from '@angular/common/http';
import {PERMISSION_CONFIG} from '../config/permission.config';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private config = inject(PERMISSION_CONFIG);

  private permissionsConfig = signal<PermissionsConfig | null>(null);
  private isLoaded = signal(false);

  readonly permissions = computed(() => this.permissionsConfig());
  readonly loaded = computed(() => this.isLoaded());

  loadPermissions(): Observable<any> {
    if (this.config.roleId === 0) {
      console.warn('Role ID is 0, cannot load permissions');
      this.isLoaded.set(true);
      return of(null);
    }

    const url = `${this.config.endpoint}/users-permissions/roles/${this.config.roleId}`;

    return this.http.get<RolePermissionsResponse>(url).pipe(
      tap(response => {
        this.permissionsConfig.set(response.role.permissions);
        this.isLoaded.set(true);
      }),
      catchError(error => {
        console.error('Erreur chargement permissions:', error);
        this.isLoaded.set(true);
        return of(null);
      })
    );
  }


  reloadPermissions(roleId: number): Observable<any> {
    this.config.roleId = roleId;
    this.isLoaded.set(false);
    this.permissionsConfig.set(null);
    return this.loadPermissions();
  }

  hasPermission(api: string, controller: string, action: string): boolean {
    const config = this.permissionsConfig();
    if (!config) return false;

    const apiKey = `api::${api}`;
    return config[apiKey]?.controllers?.[controller]?.[action]?.enabled ?? false;
  }

  hasPluginPermission(plugin: string, controller: string, action: string): boolean {
    const config = this.permissionsConfig();
    if (!config) return false;

    const pluginKey = `plugin::${plugin}`;
    return config[pluginKey]?.controllers?.[controller]?.[action]?.enabled ?? false;
  }

  checkMultiplePermissions(
    permissions: Array<{ plugin?: string; api?: string; controller: string; action: string }>,
    mode: 'all' | 'any' = 'all'
  ): boolean {
    const results = permissions.map(p => {
      if (p.plugin) {
        return this.hasPluginPermission(p.plugin, p.controller, p.action);
      } else if (p.api) {
        return this.hasPermission(p.api, p.controller, p.action);
      }
      return false;
    });

    return mode === 'all' ? results.every(r => r) : results.some(r => r);
  }

  canAccessUserManagement(): boolean {
    return this.hasPluginPermission('users-permissions', 'user', 'find');
  }

  canCreateUser(): boolean {
    return this.hasPluginPermission('users-permissions', 'user', 'create');
  }

  canUpdateUser(): boolean {
    return this.hasPluginPermission('users-permissions', 'user', 'update');
  }

  canDeleteUser(): boolean {
    return this.hasPluginPermission('users-permissions', 'user', 'destroy');
  }

  canManageRoles(): boolean {
    return this.hasPluginPermission('users-permissions', 'role', 'find');
  }
}
