import {inject, Injectable} from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import {RecaptchaActionService} from '../../pages/services/recaptcha-action.service';
import {RecaptchaService} from 'shared-lib';

@Injectable({
  providedIn: 'root'
})
export class RecaptchaGuard implements CanActivate {
  constructor(private recaptchaActionService: RecaptchaActionService) {}
  private recaptchaService = inject(RecaptchaService);

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    try {
      const isReady = await this.recaptchaService.isRecaptchaReady();

      if (!isReady) {
        console.warn(`⚠️ reCAPTCHA non disponible pour: ${route.routeConfig?.path}`);
        return true;
      }

      await this.recaptchaActionService.getPageViewToken();
    } catch (error) {
      console.warn(`⚠️ reCAPTCHA preload failed for: ${route.routeConfig?.path}`, error);
    }
    return true;
  }
}
