import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {map} from 'rxjs';
import {PermissionCheck, PermissionDeniedToastOptions, PermissionMode} from '../models';
import {PermissionService} from '../services';
import {TranslateService} from '@ngx-translate/core';
import {PERMISSION_CONFIG} from '../config/permission.config';
import {TOAST_SERVICE} from '../tokens/toast.token';

export function pluginPermissionGuard(
  plugin: string,
  controller: string,
  action: string,
  toastOptions?: PermissionDeniedToastOptions
): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const config = inject(PERMISSION_CONFIG);
    const translate = inject(TranslateService);
    const toastService = inject(TOAST_SERVICE, { optional: true });
    const router = inject(Router);

    if (config.roleId === 0) {
      return false;
    }

    if (!permissionService.loaded()) {
      return permissionService.loadPermissions().pipe(
        map(() => {
          const hasAccess = permissionService.hasPluginPermission(plugin, controller, action);
          if (!hasAccess) {
            showPermissionDeniedToast(toastService, translate, toastOptions, router);
          }
          return hasAccess;
        })
      );
    }

    const hasAccess = permissionService.hasPluginPermission(plugin, controller, action);
    if (!hasAccess) {
      showPermissionDeniedToast(toastService, translate, toastOptions, router);
    }
    return hasAccess;
  };
}


export function apiPermissionGuard(
  api: string,
  controller: string,
  action: string,
  toastOptions?: PermissionDeniedToastOptions
): CanActivateFn {
  return multiplePermissionsGuard(
    [{ api, controller, action }],
    'all',
    toastOptions
  );
}

export function multiplePermissionsGuard(
  permissions: PermissionCheck[],
  mode: PermissionMode = 'all',
  toastOptions?: PermissionDeniedToastOptions
): CanActivateFn {
  return () => {
    const permissionService = inject(PermissionService);
    const config = inject(PERMISSION_CONFIG);
    const translate = inject(TranslateService);
    const toastService = inject(TOAST_SERVICE, { optional: true });
    const router = inject(Router);

    if (config.roleId === 0) {
      return false;
    }

    if (!permissionService.loaded()) {
      return permissionService.loadPermissions().pipe(
        map(() => {
          const hasAccess = checkMultiplePermissions(permissionService, permissions, mode);
          if (!hasAccess) {
            showPermissionDeniedToast(toastService, translate, toastOptions, router);
          }
          return hasAccess;
        })
      );
    }

    const hasAccess = checkMultiplePermissions(permissionService, permissions, mode);
    if (!hasAccess) {
      showPermissionDeniedToast(toastService, translate, toastOptions, router);
    }
    return hasAccess;
  };
}

function checkMultiplePermissions(
  service: PermissionService,
  permissions: PermissionCheck[],
  mode: PermissionMode
): boolean {
  const results = permissions.map(p => {
    if (p.plugin) {
      return service.hasPluginPermission(p.plugin, p.controller, p.action);
    } else if (p.api) {
      return service.hasPermission(p.api, p.controller, p.action);
    }
    return false;
  });

  return mode === 'all' ? results.every(r => r) : results.some(r => r);
}

function showPermissionDeniedToast(
  toastService: any,
  translate: TranslateService,
  options: PermissionDeniedToastOptions | undefined,
  router: Router
) {
  if (!toastService || options?.showToast === false) {
    router.navigate(['/']);
    return;
  }

  const defaultConfig = {
    type: 'danger',
    variant: 'header',
    style: 'border',
    position: 'top-center',
    icon: 'bi-exclamation-triangle-fill',
    autohide: true,
    delay: 3000,
    title: translate.instant('permissions.denied.title'),
    message: translate.instant('permissions.denied.message')
  };

  if (options?.customToastConfigFactory) {
    const config = options.customToastConfigFactory(translate);
    toastService.show(config);
    router.navigate(['/']);
    return;
  }

  if (options?.customToastConfig) {
    toastService.show(options.customToastConfig);
    router.navigate(['/']);
    return;
  }

  const title = options?.title ||
    (options?.translateKey ? translate.instant(`${options.translateKey}.title`, options.translateParams) : defaultConfig.title);

  const message = options?.message ||
    (options?.translateKey ? translate.instant(`${options.translateKey}.message`, options.translateParams) : defaultConfig.message);

  toastService.show({
    ...defaultConfig,
    title,
    message
  });

  router.navigate(['/']);
}
