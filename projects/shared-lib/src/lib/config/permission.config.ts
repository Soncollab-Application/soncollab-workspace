import {InjectionToken} from '@angular/core';

export interface PermissionConfig {
  endpoint: string;
  roleId: number;
  accessDeniedUrl: string;
  authUrl: string;
}

export const PERMISSION_CONFIG = new InjectionToken<PermissionConfig>('LIB_PERMISSION_CONFIG');
