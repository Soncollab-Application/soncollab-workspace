import {Component, input} from '@angular/core';
import {BadgeShape, BadgeType, BadgeVariant} from './badge.types';

@Component({
  selector: 'lib-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css'
})
export class Badge {
  type = input<BadgeType>('primary');
  variant = input<BadgeVariant>('solid');
  shape = input<BadgeShape>('rounded');
  text = input<string>('');
  icon = input<string>('');
  iconPosition = input<'left' | 'right'>('left');

  getBadgeClasses(): string {
    const classes = ['badge'];
    const type = this.type();
    const variant = this.variant();
    const shape = this.shape();

    // Variant styles
    if (variant === 'solid') {
      if (type === 'secondary-alt') {
        classes.push('text-body-emphasis', 'bg-body-secondary');
      } else {
        classes.push(`text-bg-${type}`);
      }
    } else if (variant === 'outline') {
      if (type === 'secondary') {
        classes.push('text-body-emphasis', 'border');
      } else if (type === 'secondary-alt') {
        classes.push('text-body-emphasis', 'border');
      } else {
        classes.push(`text-${type}`, 'border', `border-${type}`);
      }
    } else if (variant === 'subtle') {
      if (type === 'secondary' || type === 'secondary-alt') {
        classes.push('text-body-emphasis', 'bg-secondary-subtle');
      } else if (type === 'light') {
        classes.push('text-light', 'bg-light', 'bg-opacity-10');
      } else if (type === 'dark') {
        classes.push('text-body-emphasis', 'bg-dark-subtle');
      } else {
        classes.push(`text-${type}`, `bg-${type}-subtle`);
      }
    }

    // Shape
    if (shape === 'pill') {
      classes.push('rounded-pill');
    } else if (shape === 'square') {
      classes.push('rounded-0');
    }

    // Icon alignment
    if (this.icon()) {
      classes.push('d-inline-flex', 'align-items-center');
    }

    return classes.join(' ');
  }

  getIconClasses(): string {
    const classes = [`fi-${this.icon()}`, 'fs-sm'];

    if (this.text()) {
      if (this.iconPosition() === 'left') {
        classes.push('me-1');
      } else {
        classes.push('ms-1');
      }
    }

    return classes.join(' ');
  }
}
