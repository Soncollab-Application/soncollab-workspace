import {TranslateService} from '@ngx-translate/core';

export type PermissionCheck = {
  plugin?: string;
  api?: string;
  controller: string;
  action: string;
};

export type PermissionMode = 'all' | 'any';


export interface PermissionAction {
  enabled: boolean;
  policy: string;
}

export interface ControllerPermissions {
  [action: string]: PermissionAction;
}

export interface ApiPermissions {
  controllers: {
    [controller: string]: ControllerPermissions;
  };
}

export interface PermissionsConfig {
  [apiKey: string]: ApiPermissions;
}

export interface UserPermissionsResponse {
  permissions: PermissionsConfig;
}

export interface RolePermissionsResponse {
  role: {
    id: number;
    documentId: string;
    name: string;
    description: string;
    type: string;
    permissions: PermissionsConfig;
  };
}


export interface PermissionDeniedToastOptions {
  message?: string;
  title?: string;
  translateKey?: string;
  translateParams?: any;
  showToast?: boolean;
  customToastConfig?: any;
  customToastConfigFactory?: (translate: TranslateService) => any;
}

export interface PermissionConfig {
  endpoint: string;
  roleId: number;
  authUrl: string;
}
