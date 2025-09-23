// core/mixins/language-aware.mixin.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import {LanguageOrchestratorService} from '../services';

/**
 * Mixin pour les composants qui doivent réagir aux changements de langue
 * Utilisation: extends LanguageAwareMixin dans votre composant
 */
@Injectable()
export abstract class LanguageAwareMixin implements OnDestroy {
  protected destroy$ = new Subject<void>();
  private readonly componentId: string;

  protected constructor(
    protected languageOrchestrator: LanguageOrchestratorService,
    componentId?: string
  ) {
    // Générer un ID unique si non fourni
    this.componentId = componentId || this.generateComponentId();
    this.registerForLanguageChanges();
  }

  private generateComponentId(): string {
    return `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private registerForLanguageChanges(): void {
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
  }

  /**
   * Méthode abstraite que chaque composant doit implémenter
   * pour définir ce qui se passe lors d'un changement de langue
   */
  protected abstract onLanguageChange(): void;

  /**
   * Méthode pour désactiver temporairement les notifications
   */
  protected pauseLanguageNotifications(): void {
    this.languageOrchestrator.setComponentActive(this.componentId, false);
  }

  /**
   * Méthode pour réactiver les notifications
   */
  protected resumeLanguageNotifications(): void {
    this.languageOrchestrator.setComponentActive(this.componentId, true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }

  protected getComponentId(): string {
    return this.componentId;
  }
}

/**
 * Fonction utilitaire pour créer un composant conscient des langues
 * sans utiliser l'héritage (approche par composition)
 */
export function createLanguageAwareComponent(
  orchestrator: LanguageOrchestratorService,
  onLanguageChangeCallback: () => void,
  componentId?: string
) {
  const id = componentId || `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  orchestrator.registerComponent(id, onLanguageChangeCallback);

  return {
    componentId: id,
    pauseNotifications: () => orchestrator.setComponentActive(id, false),
    resumeNotifications: () => orchestrator.setComponentActive(id, true),
    unregister: () => orchestrator.unregisterComponent(id)
  };
}
