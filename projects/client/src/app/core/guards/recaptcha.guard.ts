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
      await this.recaptchaService.getPageViewToken();
      console.log(`✅ reCAPTCHA ready for: ${route.routeConfig?.path}`);
    } catch (error) {
      console.warn(`⚠️ reCAPTCHA preload failed for: ${route.routeConfig?.path}`, error);
    }
    return true;
  }
}
