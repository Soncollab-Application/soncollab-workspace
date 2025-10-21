import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {inject} from '@angular/core';
import {CustomPermission} from '../models/auth.model';

export const customPermissionGuard = (
  permissions: CustomPermission[],
  mode: 'all' | 'any' = 'any'
): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const hasPermission = mode === 'all'
      ? authService.hasAllCustomPermissions(permissions)
      : authService.hasAnyCustomPermission(permissions);

    if (!hasPermission) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
};
