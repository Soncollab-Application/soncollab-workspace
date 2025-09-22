import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastPosition =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'middle-start'
  | 'middle-center'
  | 'middle-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

export interface Toast {
  id: string;
  header?: string;
  body: string;
  type: 'success' | 'error' | 'warning' | 'info';
  delay?: number;
  autohide?: boolean;
  position?: ToastPosition;
}

export interface ToastConfig {
  header?: string;
  delay?: number;
  autohide?: boolean;
  position?: ToastPosition;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private toasts: Toast[] = [];
  private defaultPosition: ToastPosition = 'top-end';

  /**
   * Définit la position par défaut pour tous les toasts
   */
  setDefaultPosition(position: ToastPosition): void {
    this.defaultPosition = position;
  }

  /**
   * Obtient la position par défaut
   */
  getDefaultPosition(): ToastPosition {
    return this.defaultPosition;
  }

  showSuccess(message: string, config?: ToastConfig): void {
    this.show({
      type: 'success',
      body: message,
      header: config?.header || 'Succès',
      delay: config?.delay ?? 5000,
      autohide: config?.autohide ?? true,
      position: config?.position ?? this.defaultPosition
    });
  }

  showError(message: string, config?: ToastConfig): void {
    this.show({
      type: 'error',
      body: message,
      header: config?.header || 'Erreur',
      delay: config?.delay ?? 8000,
      autohide: config?.autohide ?? true,
      position: config?.position ?? this.defaultPosition
    });
  }

  showWarning(message: string, config?: ToastConfig): void {
    this.show({
      type: 'warning',
      body: message,
      header: config?.header || 'Attention',
      delay: config?.delay ?? 6000,
      autohide: config?.autohide ?? true,
      position: config?.position ?? this.defaultPosition
    });
  }

  showInfo(message: string, config?: ToastConfig): void {
    this.show({
      type: 'info',
      body: message,
      header: config?.header || 'Information',
      delay: config?.delay ?? 5000,
      autohide: config?.autohide ?? true,
      position: config?.position ?? this.defaultPosition
    });
  }

  /**
   * Affiche un toast avec configuration complète
   */
  showToast(
    type: Toast['type'],
    message: string,
    config?: ToastConfig
  ): void {
    const methods = {
      success: this.showSuccess.bind(this),
      error: this.showError.bind(this),
      warning: this.showWarning.bind(this),
      info: this.showInfo.bind(this)
    };

    methods[type](message, config);
  }

  private show(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      ...toast,
      id: this.generateId(),
      position: toast.position ?? this.defaultPosition
    };

    this.toasts.push(newToast);
    this.toastsSubject.next([...this.toasts]);
  }

  remove(toastId: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== toastId);
    this.toastsSubject.next([...this.toasts]);
  }

  /**
   * Supprime tous les toasts d'une position spécifique
   */
  clearByPosition(position: ToastPosition): void {
    this.toasts = this.toasts.filter(toast => toast.position !== position);
    this.toastsSubject.next([...this.toasts]);
  }

  /**
   * Supprime tous les toasts
   */
  clear(): void {
    this.toasts = [];
    this.toastsSubject.next([]);
  }

  /**
   * Obtient tous les toasts d'une position spécifique
   */
  getToastsByPosition(position: ToastPosition): Toast[] {
    return this.toasts.filter(toast => toast.position === position);
  }

  /**
   * Obtient toutes les positions actives (qui ont des toasts)
   */
  getActivePositions(): ToastPosition[] {
    const positions = new Set(this.toasts.map(toast => toast.position || this.defaultPosition));
    return Array.from(positions);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
