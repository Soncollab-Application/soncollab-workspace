import { Injectable } from '@angular/core';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live en millisecondes
  priority?: 'high' | 'medium' | 'low'; // Priorité pour l'éviction
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 200; // Limite pour éviter la surconsommation mémoire

  /**
   * Stocke une donnée dans le cache avec gestion de priorité
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Vérification de la taille du cache
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLowPriorityItems();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      priority
    });
  }

  /**
   * Récupère une donnée du cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    // Vérifier si l'item a expiré
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Vérifie si une clé existe et est valide
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Nettoie les entrées expirées de manière non-bloquante
   */
  cleanup(): void {
    // Utiliser requestIdleCallback pour ne pas bloquer le thread principal
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.performCleanup();
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas requestIdleCallback
      setTimeout(() => {
        this.performCleanup();
      }, 0);
    }
  }

  /**
   * Nettoyage réel du cache
   */
  private performCleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        toDelete.push(key);
      }
    }

    // Suppression par batch pour optimiser
    toDelete.forEach(key => this.cache.delete(key));

    if (toDelete.length > 0) {}
  }

  /**
   * Éviction des items de basse priorité en cas de surcharge
   */
  private evictLowPriorityItems(): void {
    const lowPriorityItems: string[] = [];
    const mediumPriorityItems: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.priority === 'low') {
        lowPriorityItems.push(key);
      } else if (item.priority === 'medium') {
        mediumPriorityItems.push(key);
      }
    }

    // Supprimer d'abord les items de basse priorité
    const toRemove = lowPriorityItems.length > 0 ? lowPriorityItems : mediumPriorityItems;
    const removeCount = Math.min(toRemove.length, 20); // Supprimer max 20 items

    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(toRemove[i]);
    }
  }

  /**
   * Cache avec fonction de récupération automatique (non-bloquant)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T> | T,
    ttl: number = this.DEFAULT_TTL,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl, priority);
    return data;
  }

  /**
   * Précharge des ressources de manière optimisée et non-bloquante
   */
  preloadAssets(assets: string[], priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Utiliser requestIdleCallback pour ne pas bloquer
    requestIdleCallback(() => {
      this.performAssetPreloading(assets, priority);
    });
  }

  /**
   * Préchargement réel des assets avec gestion des erreurs
   */
  private performAssetPreloading(assets: string[], priority: 'high' | 'medium' | 'low'): void {
    assets.forEach((asset, index) => {
      // Délai progressif pour éviter la congestion
      setTimeout(() => {
        try {
          if (asset.endsWith('.jpg') || asset.endsWith('.png') || asset.endsWith('.webp') || asset.endsWith('.svg')) {
            this.preloadImage(asset, priority);
          } else if (asset.endsWith('.mp4') || asset.endsWith('.webm')) {
            this.preloadVideo(asset, priority);
          }
        } catch (error) {
          console.warn(`Erreur préchargement ${asset}:`, error);
        }
      }, index * 100); // 100ms entre chaque asset
    });
  }

  /**
   * Préchargement d'image optimisé
   */
  private preloadImage(src: string, priority: 'high' | 'medium' | 'low'): void {
    const cacheKey = `img_${src}`;
    if (this.has(cacheKey)) return;

    const img = new Image();

    img.onload = () => {
      this.set(cacheKey, true, 30 * 60 * 1000, priority); // 30min
    };

    img.onerror = () => {
      console.warn(`❌ Erreur préchargement image: ${src}`);
    };

    img.src = src;
  }

  /**
   * Préchargement de vidéo optimisé
   */
  private preloadVideo(src: string, priority: 'high' | 'medium' | 'low'): void {
    const cacheKey = `video_${src}`;
    if (this.has(cacheKey)) return;

    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      this.set(cacheKey, true, 30 * 60 * 1000, priority);
    };

    video.onerror = () => {
      console.warn(`❌ Erreur préchargement vidéo: ${src}`);
    };

    video.src = src;
  }

  /**
   * Retourne les statistiques du cache
   */
  getStats(): { size: number; items: string[]; memoryUsage: string } {
    const items = Array.from(this.cache.keys());
    const memoryUsage = this.estimateMemoryUsage();

    return {
      size: this.cache.size,
      items,
      memoryUsage
    };
  }

  /**
   * Estimation approximative de l'usage mémoire
   */
  private estimateMemoryUsage(): string {
    const estimatedBytes = this.cache.size * 100; // Estimation très approximative
    if (estimatedBytes < 1024) return `${estimatedBytes} B`;
    if (estimatedBytes < 1024 * 1024) return `${Math.round(estimatedBytes / 1024)} KB`;
    return `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
  }

  /**
   * Méthode pour précharger les assets critiques avec haute priorité
   */
  preloadCriticalAssets(assets: string[]): void {
    this.preloadAssets(assets, 'high');
  }

  /**
   * Invalidation du cache par pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}
