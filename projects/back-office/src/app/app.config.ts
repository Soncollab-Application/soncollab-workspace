import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi
} from '@angular/common/http';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {
  ApplicationConfig,
  importProvidersFrom, inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter} from '@angular/router';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module} from 'ng-recaptcha-2';
import {provideMarkdown} from 'ngx-markdown';
import {IMAGE_CONFIG} from '@angular/common';
import {AuthInterceptor} from './core/services/http-interceptor.service';
import {filter, firstValueFrom, of, switchMap, take} from 'rxjs';
import {routes} from './app.routes';
import {FormsModule} from '@angular/forms';
import {AuthService} from './core/services/auth.service';
import {environment} from '../environments/environment';
import {PERMISSION_CONFIG, PermissionService, SharedLibModule, TOAST_SERVICE, ToastService } from "shared-lib";


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withFetch()
    ),
    importProvidersFrom(FormsModule),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      }),
      RecaptchaV3Module,
      SharedLibModule
    ),
    provideMarkdown(),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true
      }
    },
    {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: environment.recaptcha.siteKey
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: PERMISSION_CONFIG,
      useValue: {
        endpoint: environment.api.fullUrl,
        roleId: 0,
        authUrl: '/auth/login'
      }
    },
    {
      provide: TOAST_SERVICE,
      useExisting: ToastService
    },
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      const permissionService = inject(PermissionService);
      const config = inject(PERMISSION_CONFIG);

      return firstValueFrom(
        authService.authState$.pipe(
          filter(authState => !authState.loading),
          take(1),
          switchMap(authState => {
            if (authState.isAuthenticated && authState.user?.role?.id) {
              config.roleId = authState.user.role.id;
              return permissionService.loadPermissions();
            }
            return of(null);
          })
        )
      );
    })
  ]
};
