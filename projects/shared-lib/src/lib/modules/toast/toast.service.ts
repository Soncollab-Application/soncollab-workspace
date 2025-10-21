import {Injectable, signal} from '@angular/core';
import {ToastConfig, ToastItem, ToastPosition} from './toast.types';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<ToastItem[]>([]);
  public toasts$ = this.toasts.asReadonly();

  private defaultPosition: ToastPosition = 'top-end';

  show(config: Omit<ToastItem, 'id'>): void {
    const toast: ToastItem = {
      ...config,
      id: this.generateId(),
      position: config.position ?? this.defaultPosition,
      variant: config.variant ?? 'tiny-icon',
      autohide: config.autohide ?? true,
      delay: config.delay ?? 5000,
      timestamp: new Date()
    };

    this.toasts.update(current => [...current, toast]);
  }

  showSuccess(message: string, config?: ToastConfig): void {
    this.show({
      type: 'success',
      style: 'border',
      variant: 'tiny-icon',
      message,
      icon: config?.icon ?? 'check_circle',
      title: config?.title ?? 'Success',
      ...config
    });
  }

  showError(message: string, config?: ToastConfig): void {
    this.show({
      type: 'danger',
      style: 'border',
      variant: 'tiny-icon',
      message,
      icon: config?.icon ?? 'cancel',
      title: config?.title ?? 'Error',
      ...config
    });
  }

  showWarning(message: string, config?: ToastConfig): void {
    this.show({
      type: 'warning',
      style: 'border',
      variant: 'tiny-icon',
      message,
      icon: config?.icon ?? 'warning',
      title: config?.title ?? 'Warning',
      ...config
    });
  }

  showInfo(message: string, config?: ToastConfig): void {
    this.show({
      type: 'info',
      style: 'border',
      variant: 'tiny-icon',
      message,
      icon: config?.icon ?? 'info',
      title: config?.title ?? 'Info',
      ...config
    });
  }

  showDefault(message: string, config?: ToastConfig): void {
    this.show({
      type: 'default',
      message,
      icon: config?.icon ?? 'notifications',
      title: config?.title,
      ...config
    });
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }

  clearByPosition(position: ToastPosition): void {
    this.toasts.update(current => current.filter(t => t.position !== position));
  }

  getToastsByPosition(position: ToastPosition): ToastItem[] {
    return this.toasts().filter(t => t.position === position);
  }

  getActivePositions(): ToastPosition[] {
    return [...new Set(this.toasts().map(t => t.position ?? this.defaultPosition))];
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
