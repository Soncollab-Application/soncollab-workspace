import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { RecaptchaService } from '../services/recaptcha.service';

@Injectable({
  providedIn: 'root'
})
export class RecaptchaGuard implements CanActivate {
  constructor(private recaptchaService: RecaptchaService) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    try {
      const isReady = await this.recaptchaService.isRecaptchaReady();

      if (!isReady) {
        console.warn(`⚠️ reCAPTCHA non disponible pour: ${route.routeConfig?.path}`);
        return true;
      }

      await this.recaptchaService.getPageViewToken();
    } catch (error) {
      console.warn(`⚠️ reCAPTCHA preload failed for: ${route.routeConfig?.path}`, error);
    }
    return true;
  }
}
