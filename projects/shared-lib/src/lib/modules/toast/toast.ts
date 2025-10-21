import {Component, effect, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ToastAction, ToastItem, ToastPosition} from './toast.types';
import {ToastService} from './toast.service';


@Component({
  selector: 'lib-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.css']
})
export class Toast {
  private toastService = inject(ToastService);

  toasts = this.toastService.toasts$;
  activePositions = signal<ToastPosition[]>([]);
  private timers = new Map<string, number>();

  constructor() {
    effect(() => {
      const toasts = this.toasts();
      this.activePositions.set(this.toastService.getActivePositions());

      toasts.forEach(toast => {
        if (toast.autohide && !this.timers.has(toast.id)) {
          const timer = window.setTimeout(() => {
            this.remove(toast.id);
          }, toast.delay);
          this.timers.set(toast.id, timer);
        }
      });
    });
  }

  getToastsByPosition(position: ToastPosition): ToastItem[] {
    return this.toastService.getToastsByPosition(position);
  }

  getPositionClass(position: ToastPosition): string {
    const map: Record<ToastPosition, string> = {
      'top-start': 'top-0 start-0',
      'top-center': 'top-0 start-50 translate-middle-x',
      'top-end': 'top-0 end-0',
      'middle-start': 'top-50 start-0 translate-middle-y',
      'middle-center': 'top-50 start-50 translate-middle',
      'middle-end': 'top-50 end-0 translate-middle-y',
      'bottom-start': 'bottom-0 start-0',
      'bottom-center': 'bottom-0 start-50 translate-middle-x',
      'bottom-end': 'bottom-0 end-0'
    };
    return map[position];
  }

  getToastClasses(toast: ToastItem): string {
    const classes: string[] = [];

    // Style solid (background coloré)
    if (toast.style === 'solid') {
      const typeMap: Record<string, string> = {
        'primary': 'text-bg-primary border-0',
        'secondary': 'text-bg-secondary border-0',
        'success': 'text-bg-success border-0',
        'danger': 'text-bg-danger border-0',
        'warning': 'text-bg-warning border-0',
        'info': 'text-bg-info border-0',
        'light': 'text-bg-light border-0',
        'dark': 'text-bg-dark border-0'
      };
      classes.push(typeMap[toast.type] || '');
    }
    // Style border (bordure colorée)
    else if (toast.style === 'border') {
      const borderMap: Record<string, string> = {
        'primary': 'border-primary',
        'secondary': 'border-secondary',
        'success': 'border-success',
        'danger': 'border-danger',
        'warning': 'border-warning',
        'info': 'border-info',
        'dark': 'border-dark'
      };
      classes.push(borderMap[toast.type] || '');
    }

    return classes.join(' ');
  }

  getDataBsTheme(toast: ToastItem): string | null {
    if (toast.type === 'light') return 'light';
    if (toast.style === 'solid' && toast.type !== 'default') return 'dark';
    return null;
  }

  getHeaderIconClasses(toast: ToastItem): string {
    const classes: string[] = ['material-symbols-outlined', 'fs-base', 'me-2'];

    if (toast.style === 'border') {
      const colorMap: Record<string, string> = {
        'primary': 'text-primary',
        'secondary': 'text-secondary',
        'success': 'text-success',
        'danger': 'text-danger',
        'warning': 'text-warning',
        'info': 'text-info',
        'dark': 'text-dark'
      };
      classes.push(colorMap[toast.type] || 'text-body-secondary');
    } else if (toast.type === 'default') {
      classes.push('text-body-secondary');
    }

    // Gestion du dark border avec double icône
    if (toast.type === 'dark' && toast.style === 'border') {
      classes.push('d-none-dark');
    }

    return classes.join(' ');
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 min ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  }

  remove(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastService.remove(id);
  }

  onActionClick(toastId: string, action: ToastAction): void {
    action.callback();
    this.remove(toastId);
  }
}
