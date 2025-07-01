import { Injectable, inject } from '@angular/core';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private cacheService = inject(CacheService);
  private initialized = false;

  constructor() {
    this.initializeNonBlocking();
  }

  /**
   * Initialisation non-bloquante - ne retarde pas le démarrage de l'app
   */
  private initializeNonBlocking(): void {
    // Démarrage immédiat mais asynchrone
    requestIdleCallback(() => {
      this.performInitialization();
    }, { timeout: 100 }); // Très court timeout pour ne pas bloquer
  }

  /**
   * Initialisation réelle en arrière-plan
   */
  private async performInitialization(): Promise<void> {
    if (this.initialized) return;

    // Nettoyage léger du cache
    this.performLightCleanup();

    // Préchargement différé des assets critiques
    setTimeout(() => {
      this.preloadCriticalResources();
    }, 500); // Délai pour ne pas interférer avec le rendu initial

    // Configuration du nettoyage périodique
    this.setupPeriodicCleanup();

    this.initialized = true;
  }

  /**
   * Nettoyage léger pour ne pas impacter les performances au démarrage
   */
  private performLightCleanup(): void {
    // Utiliser requestIdleCallback pour ne pas bloquer le thread principal
    requestIdleCallback(() => {
      this.cacheService.cleanup();
    });
  }

  /**
   * Préchargement intelligent des assets critiques
   */
  private preloadCriticalResources(): void {
    // Assets par ordre de priorité
    const criticalAssets = [
      // Logo (très haute priorité)
      '/assets/images/logo/soncollablightlogo.svg',

      // Image hero fallback (haute priorité)
      '/assets/images/hero-fallback.jpg'
    ];

    const secondaryAssets = [
      // Icons principaux (priorité moyenne)
      '/assets/images/for_ld/catalog.svg',
      '/assets/images/for_ld/distribution.svg',
      '/assets/images/for_ld/royalties.svg',
      '/assets/images/for_ld/payment.svg'
    ];

    const tertiaryAssets = [
      // Autres assets (basse priorité)
      '/assets/images/for_ld/analytics.svg',
      '/assets/images/for_ld/teams.svg',
      '/assets/images/for_ld/api.svg'
    ];

    // Chargement par vagues pour éviter la congestion
    this.loadAssetsInWaves(criticalAssets, secondaryAssets, tertiaryAssets);
  }

  /**
   * Chargement des assets par vagues avec délais progressifs
   */
  private loadAssetsInWaves(...assetGroups: string[][]): void {
    assetGroups.forEach((assets, index) => {
      setTimeout(() => {
        requestIdleCallback(() => {
          this.cacheService.preloadAssets(assets);
        });
      }, index * 1000); // 1s entre chaque vague
    });
  }

  /**
   * Configuration du nettoyage périodique optimisé
   */
  private setupPeriodicCleanup(): void {
    // Nettoyage moins fréquent mais plus intelligent
    const cleanupInterval = setInterval(() => {
      // Utiliser requestIdleCallback pour ne pas impacter les performances
      requestIdleCallback(() => {
        this.cacheService.cleanup();

        // Stats pour monitoring
        const stats = this.cacheService.getStats();
        if (stats.size > 100) {
          console.warn(`Cache volumineux: ${stats.size} items`);
        }
      });
    }, 15 * 60 * 1000); // 15 minutes au lieu de 10

    // Nettoyage lors de la fermeture/changement de page
    window.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval);
    });

    // Nettoyage lors de la perte de focus (mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.cacheService.cleanup();
      }
    });
  }

  /**
   * Méthode publique pour forcer l'initialisation si nécessaire
   */
  public ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    return this.performInitialization();
  }

  /**
   * Méthode pour vérifier si l'initialisation est terminée
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}
