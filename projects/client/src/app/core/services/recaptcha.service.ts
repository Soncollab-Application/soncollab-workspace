import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private siteKey = environment.recaptcha.siteKey;

  async executeAction(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(this.siteKey, { action })
          .then((token: string) => resolve(token))
          .catch((error: any) => reject(error));
      });
    });
  }

  // Actions prédéfinies
  async getContactFormToken(): Promise<string> {
    return this.executeAction('contact_form');
  }

  async getNewsletterToken(): Promise<string> {
    return this.executeAction('newsletter');
  }

  async getPageViewToken(): Promise<string> {
    return this.executeAction('page_view');
  }

  async getBlogViewToken(): Promise<string> {
    return this.executeAction('blog_view');
  }

  async getHelpViewToken(): Promise<string> {
    return this.executeAction('help_view');
  }

  async getRatingToken(): Promise<string> {
    return this.executeAction('rating');
  }
}
