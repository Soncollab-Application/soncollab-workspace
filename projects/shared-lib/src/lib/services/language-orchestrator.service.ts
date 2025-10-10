import { Injectable, effect, untracked } from '@angular/core';
import { LanguageService } from './language.service';

interface ComponentRegistration {
  id: string;
  callback: () => void;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class LanguageOrchestratorService {
  private registeredComponents = new Map<string, ComponentRegistration>();
  private isFirstRun = true;

  constructor(private languageService: LanguageService) {
    effect(() => {
      const lang = this.languageService.currentLanguage();

      if (this.isFirstRun) {
        this.isFirstRun = false;
        return;
      }

      untracked(() => {
        this.notifyAllComponents();
      });
    });
  }

  registerComponent(componentId: string, callback: () => void): void {
    this.registeredComponents.set(componentId, {
      id: componentId,
      callback,
      isActive: true
    });
  }

  unregisterComponent(componentId: string): void {
    this.registeredComponents.delete(componentId);
  }

  setComponentActive(componentId: string, isActive: boolean): void {
    const component = this.registeredComponents.get(componentId);
    if (component) {
      component.isActive = isActive;
    }
  }

  private notifyAllComponents(): void {
    this.registeredComponents.forEach(component => {
      if (component.isActive) {
        try {
          component.callback();
        } catch (error) {
          console.error(`Erreur notification ${component.id}:`, error);
        }
      }
    });
  }

  reloadComponent(componentId: string): void {
    const component = this.registeredComponents.get(componentId);
    if (component && component.isActive) {
      component.callback();
    }
  }

  getRegisteredComponents(): string[] {
    return Array.from(this.registeredComponents.keys());
  }
}
