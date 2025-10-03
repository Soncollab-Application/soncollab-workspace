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
