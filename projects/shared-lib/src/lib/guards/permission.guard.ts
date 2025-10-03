import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {PermissionService} from '../services';
import {PERMISSION_CONFIG} from '../config/permission.config';
import {map} from 'rxjs';

export function pluginPermissionGuard(
  plugin: string,
  controller: string,
  action: string
): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const config = inject(PERMISSION_CONFIG);

    // Si pas de roleId, pas connecté
    if (config.roleId === 0) {
      router.navigate([config.authUrl]);
      return false;
    }

    // Si permissions pas chargées, les charger d'abord
    if (!permissionService.loaded()) {
      return permissionService.loadPermissions().pipe(
        map(() => {
          const hasAccess = permissionService.hasPluginPermission(plugin, controller, action);
          if (!hasAccess) {
            router.navigate([config.accessDeniedUrl]);
          }
          return hasAccess;
        })
      );
    }

    // Sinon vérifier directement
    const hasAccess = permissionService.hasPluginPermission(plugin, controller, action);
    if (!hasAccess) {
      router.navigate([config.accessDeniedUrl]);
    }
    return hasAccess;
  };
}

export function permissionGuard(
  api: string,
  controller: string,
  action: string
): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);
    const config = inject(PERMISSION_CONFIG);

    if (config.roleId === 0) {
      router.navigate([config.authUrl]);
      return false;
    }

    if (!permissionService.loaded()) {
      return permissionService.loadPermissions().pipe(
        map(() => {
          const hasAccess = permissionService.hasPermission(api, controller, action);
          if (!hasAccess) {
            router.navigate([config.accessDeniedUrl]);
          }
          return hasAccess;
        })
      );
    }

    const hasAccess = permissionService.hasPermission(api, controller, action);
    if (!hasAccess) {
      router.navigate([config.accessDeniedUrl]);
    }
    return hasAccess;
  };
}
