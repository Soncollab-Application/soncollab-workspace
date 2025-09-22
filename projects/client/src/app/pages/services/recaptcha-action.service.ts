import {inject, Injectable} from '@angular/core';
import {RecaptchaService} from 'shared-lib';

@Injectable({
  providedIn: 'root'
})
export class RecaptchaActionService {
  private recaptchaService = inject(RecaptchaService);

  // Actions prédéfinies - Aucun changement nécessaire
  async getContactFormToken(): Promise<string> {
    return this.recaptchaService.executeAction('contact_form');
  }

  async getNewsletterToken(): Promise<string> {
    return this.recaptchaService.executeAction('newsletter');
  }

  async getPageViewToken(): Promise<string> {
    return this.recaptchaService.executeAction('page_view');
  }

  async getBlogViewToken(): Promise<string> {
    return this.recaptchaService.executeAction('blog_view');
  }

  async getHelpViewToken(): Promise<string> {
    return this.recaptchaService.executeAction('help_view');
  }

  async getRatingToken(): Promise<string> {
    return this.recaptchaService.executeAction('rating');
  }
}
