
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// Pour ng-recaptcha-2, on garde la même approche avec grecaptcha global
declare const grecaptcha: any;

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private siteKey = environment.recaptcha.siteKey;

  /**
   * Méthode principale pour exécuter une action reCAPTCHA
   */
  async executeAction(action: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Vérification que grecaptcha est disponible
      if (typeof grecaptcha === 'undefined') {
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }

      grecaptcha.ready(() => {
        grecaptcha.execute(this.siteKey, { action })
          .then((token: string) => {
            resolve(token);
          })
          .catch((error: any) => {
            console.error(`❌ Erreur reCAPTCHA pour l'action ${action}:`, error);
            reject(error);
          });
      });
    });
  }

  /**
   * Vérifie si reCAPTCHA est prêt
   */
  isRecaptchaReady(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof grecaptcha === 'undefined') {
        resolve(false);
        return;
      }
      grecaptcha.ready(() => resolve(true));
    });
  }

  // Actions prédéfinies - Aucun changement nécessaire
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
