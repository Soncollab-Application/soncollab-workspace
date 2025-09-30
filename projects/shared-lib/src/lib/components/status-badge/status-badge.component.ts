import {Component, computed, input} from '@angular/core';
import {CommonModule} from '@angular/common';

export type BadgeStatus = 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'primary';

export interface StatusConfig {
  label: string;
  status: BadgeStatus;
  icon?: string;
}

@Component({
  selector: 'lib-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClass()">
      @if (config().icon) {
        <i [class]="'bi bi-' + config().icon + ' me-1'"></i>
      }
      {{ config().label }}
    </span>
  `,
  styles: [`
    span {
      font-size: 0.875rem;
      font-weight: 500;
    }
  `]
})
export class StatusBadgeComponent {
  config = input.required<StatusConfig>();

  badgeClass = computed(() => `badge bg-${this.config().status}`);
}
