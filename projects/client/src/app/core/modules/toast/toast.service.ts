import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  header?: string;
  body: string;
  type: 'success' | 'error' | 'warning' | 'info';
  delay?: number;
  autohide?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private toasts: Toast[] = [];

  showSuccess(message: string, header?: string): void {
    this.show({
      type: 'success',
      body: message,
      header: header || 'Succès',
      delay: 5000,
      autohide: true
    });
  }

  showError(message: string, header?: string): void {
    this.show({
      type: 'error',
      body: message,
      header: header || 'Erreur',
      delay: 8000,
      autohide: true
    });
  }

  showWarning(message: string, header?: string): void {
    this.show({
      type: 'warning',
      body: message,
      header: header || 'Attention',
      delay: 6000,
      autohide: true
    });
  }

  showInfo(message: string, header?: string): void {
    this.show({
      type: 'info',
      body: message,
      header: header || 'Information',
      delay: 5000,
      autohide: true
    });
  }

  private show(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      ...toast,
      id: this.generateId()
    };

    this.toasts.push(newToast);
    this.toastsSubject.next([...this.toasts]);
  }

  remove(toastId: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== toastId);
    this.toastsSubject.next([...this.toasts]);
  }

  clear(): void {
    this.toasts = [];
    this.toastsSubject.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
