import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {ApplicationConfig, importProvidersFrom, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {HttpClient, provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {IMAGE_CONFIG} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {provideMarkdown} from 'ngx-markdown';
import {RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module} from 'ng-recaptcha-2';
import {environment} from '../environments/environment';
import {RECAPTCHA_CONFIG, RecaptchaConfig , SharedLibModule} from 'shared-lib';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

const recaptchaConfig: RecaptchaConfig = {
  siteKey: environment.recaptcha.siteKey,
  enabled: true
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
    ),
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
      provide: RECAPTCHA_CONFIG,
      useValue: recaptchaConfig
    },
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
  ]
};
