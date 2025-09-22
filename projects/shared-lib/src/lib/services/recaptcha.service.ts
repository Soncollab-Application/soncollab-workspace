import { Injectable, Inject, InjectionToken, Optional } from '@angular/core';

// Token d'injection pour la configuration reCAPTCHA
export const RECAPTCHA_CONFIG = new InjectionToken<RecaptchaConfig>('RECAPTCHA_CONFIG');

export interface RecaptchaConfig {
  siteKey: string;
  enabled?: boolean;
}

// Déclaration globale pour grecaptcha
declare const grecaptcha: any;

@Injectable({
  providedIn: 'root'
})
export class RecaptchaService {
  private siteKey: string;
  private enabled: boolean;

  constructor(
    @Optional() @Inject(RECAPTCHA_CONFIG) private config: RecaptchaConfig | null
  ) {
    // Configuration par défaut si aucune config n'est fournie
    this.siteKey = this.config?.siteKey || '';
    this.enabled = this.config?.enabled !== false;

    if (!this.siteKey && this.enabled) {
      console.warn('⚠️ RecaptchaActionService: Aucune clé de site fournie. Le service sera désactivé.');
      this.enabled = false;
    }
  }

  /**
   * Méthode principale pour exécuter une action reCAPTCHA
   */
  async executeAction(action: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('reCAPTCHA is disabled');
    }

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
    if (!this.enabled) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      if (typeof grecaptcha === 'undefined') {
        resolve(false);
        return;
      }
      grecaptcha.ready(() => resolve(true));
    });
  }

  /**
   * Vérifie si le service est activé
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: RecaptchaConfig): void {
    this.siteKey = config.siteKey;
    this.enabled = config.enabled !== false;
  }

}
