import { Injectable } from '@angular/core';
import { LanguageService } from './language.service';
import { BehaviorSubject, Observable, filter, distinctUntilChanged, takeUntil } from 'rxjs';

export interface ComponentRegistration {
  id: string;
  callback: () => void;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageOrchestratorService {
  private registeredComponents = new Map<string, ComponentRegistration>();
  private languageInitialized = new BehaviorSubject<boolean>(false);

  constructor(private languageService: LanguageService) {
    this.initializeOrchestrator();
  }

  private initializeOrchestrator(): void {
    // Écouter UNIQUEMENT les vrais changements de langue (pas l'initialisation)
    this.languageService.languageChanged$
      .pipe(
        filter(() => this.languageInitialized.value), // Ignorer l'émission initiale
        distinctUntilChanged()
      )
      .subscribe((newLanguage: string) => {
        this.notifyActiveComponents();
      });

    // Marquer comme initialisé après le premier émit
    this.languageService.currentLanguage$
      .pipe(filter(lang => !!lang))
      .subscribe(() => {
        if (!this.languageInitialized.value) {
          this.languageInitialized.next(true);
        }
      });
  }

  /**
   * Enregistre un composant pour recevoir les notifications de changement de langue
   */
  registerComponent(componentId: string, callback: () => void): void {
    this.registeredComponents.set(componentId, {
      id: componentId,
      callback,
      isActive: true
    });
  }

  /**
   * Désenregistre un composant
   */
  unregisterComponent(componentId: string): void {
    this.registeredComponents.delete(componentId);
  }

  /**
   * Active/désactive un composant (utile pour les composants temporairement inactifs)
   */
  setComponentActive(componentId: string, isActive: boolean): void {
    const component = this.registeredComponents.get(componentId);
    if (component) {
      component.isActive = isActive;
    }
  }

  /**
   * Notifie uniquement les composants actifs
   */
  private notifyActiveComponents(): void {
    this.registeredComponents.forEach(component => {
      if (component.isActive) {
        try {
          component.callback();
        } catch (error) {
          console.error(`Erreur lors de la notification du composant ${component.id}:`, error);
        }
      }
    });
  }

  /**
   * Force la recharge d'un composant spécifique
   */
  reloadComponent(componentId: string): void {
    const component = this.registeredComponents.get(componentId);
    if (component && component.isActive) {
      component.callback();
    }
  }

  /**
   * Debug - Liste les composants enregistrés
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.registeredComponents.keys());
  }
}
