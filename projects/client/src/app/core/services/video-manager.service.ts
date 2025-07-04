import { Injectable } from '@angular/core';
import {VideoSource} from '../models/video-source.model';



@Injectable({
  providedIn: 'root'
})
export class VideoManagerService {

  private readonly STORAGE_KEY = 'video_rotation_data';
  private readonly ROTATION_INTERVAL_DAYS = 3;

  // ✅ Liste des vidéos disponibles
  private readonly videoSources: VideoSource[] = [
    {
      id: 'hero-main',
      mp4: '/assets/videos/hero-background.mp4',
      webm: '/assets/videos/hero-background.webm',
      poster: '/assets/images/hero-fallback.jpg',
      name: 'Vidéo principale'
    },
  ];

  constructor() {}

  /**
   * Obtient la vidéo actuelle selon la rotation de 3 jours
   */
  getCurrentVideo(): VideoSource {
    const rotationData = this.getRotationData();
    const currentDate = new Date();
    const daysSinceLastRotation = this.getDaysDifference(rotationData.lastRotationDate, currentDate);

    // Si plus de 3 jours ou première visite
    if (daysSinceLastRotation >= this.ROTATION_INTERVAL_DAYS || !rotationData.currentVideoId) {
      return this.rotateToNewVideo();
    }

    // Retourner la vidéo actuelle ou la principale par défaut
    const currentVideo = this.videoSources.find(v => v.id === rotationData.currentVideoId);
    return currentVideo || this.videoSources[0];
  }

  /**
   * Force la rotation vers une nouvelle vidéo
   */
  rotateToNewVideo(): VideoSource {
    const rotationData = this.getRotationData();
    const availableVideos = this.getAvailableVideos(rotationData.usedVideoIds);

    let newVideo: VideoSource;

    // Si toutes les vidéos ont été utilisées, réinitialiser
    if (availableVideos.length === 0) {
      this.resetRotation();
      newVideo = this.getRandomVideo(this.videoSources);
    } else {
      newVideo = this.getRandomVideo(availableVideos);
    }

    // Sauvegarder la nouvelle rotation
    this.saveRotationData({
      currentVideoId: newVideo.id,
      lastRotationDate: new Date().toISOString(),
      usedVideoIds: [...rotationData.usedVideoIds, newVideo.id]
    });

    console.log(`🎥 Nouvelle vidéo sélectionnée: ${newVideo.name}`);
    return newVideo;
  }

  /**
   * Obtient les informations de rotation stockées
   */
  private getRotationData(): RotationData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Erreur lors de la lecture des données de rotation:', error);
    }

    // Données par défaut
    return {
      currentVideoId: '',
      lastRotationDate: '',
      usedVideoIds: []
    };
  }

  /**
   * Sauvegarde les données de rotation
   */
  private saveRotationData(data: RotationData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des données de rotation:', error);
    }
  }

  /**
   * Obtient les vidéos disponibles (non utilisées)
   */
  private getAvailableVideos(usedIds: string[]): VideoSource[] {
    return this.videoSources.filter(video => !usedIds.includes(video.id));
  }

  /**
   * Sélectionne une vidéo aléatoire dans une liste
   */
  private getRandomVideo(videos: VideoSource[]): VideoSource {
    const randomIndex = Math.floor(Math.random() * videos.length);
    return videos[randomIndex];
  }

  /**
   * Calcule la différence en jours entre deux dates
   */
  private getDaysDifference(dateStr1: string, date2: Date): number {
    if (!dateStr1) return Infinity;

    try {
      const date1 = new Date(dateStr1);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return Infinity;
    }
  }

  /**
   * Réinitialise la rotation (toutes les vidéos redeviennent disponibles)
   */
  private resetRotation(): void {
    console.log('🔄 Réinitialisation de la rotation des vidéos');
    this.saveRotationData({
      currentVideoId: '',
      lastRotationDate: '',
      usedVideoIds: []
    });
  }

  /**
   * Obtient toutes les vidéos disponibles (pour admin/debug)
   */
  getAllVideos(): VideoSource[] {
    return [...this.videoSources];
  }

  /**
   * Force une vidéo spécifique (pour admin/debug)
   */
  setSpecificVideo(videoId: string): VideoSource | null {
    const video = this.videoSources.find(v => v.id === videoId);
    if (video) {
      this.saveRotationData({
        currentVideoId: video.id,
        lastRotationDate: new Date().toISOString(),
        usedVideoIds: [video.id]
      });
      console.log(`🎯 Vidéo forcée: ${video.name}`);
    }
    return video || null;
  }

  /**
   * Obtient les statistiques de rotation
   */
  getRotationStats(): RotationStats {
    const rotationData = this.getRotationData();
    const currentDate = new Date();
    const daysSinceLastRotation = this.getDaysDifference(rotationData.lastRotationDate, currentDate);
    const daysUntilNextRotation = Math.max(0, this.ROTATION_INTERVAL_DAYS - daysSinceLastRotation);

    return {
      currentVideoId: rotationData.currentVideoId,
      currentVideoName: this.videoSources.find(v => v.id === rotationData.currentVideoId)?.name || 'Aucune',
      daysSinceLastRotation,
      daysUntilNextRotation,
      usedVideosCount: rotationData.usedVideoIds.length,
      totalVideosCount: this.videoSources.length,
      availableVideosCount: this.videoSources.length - rotationData.usedVideoIds.length
    };
  }
}

// ✅ Interfaces de typage
interface RotationData {
  currentVideoId: string;
  lastRotationDate: string;
  usedVideoIds: string[];
}

interface RotationStats {
  currentVideoId: string;
  currentVideoName: string;
  daysSinceLastRotation: number;
  daysUntilNextRotation: number;
  usedVideosCount: number;
  totalVideosCount: number;
  availableVideosCount: number;
}
