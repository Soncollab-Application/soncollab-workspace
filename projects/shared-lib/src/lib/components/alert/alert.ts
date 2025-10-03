import {Component, input, output} from '@angular/core';
import {AlertType} from './alert.types';

@Component({
  selector: 'lib-alert',
  imports: [],
  templateUrl: './alert.html',
  styleUrl: './alert.css'
})
export class Alert {
  type = input<AlertType>('primary');
  message = input.required<string>();
  icon = input<string>('');
  dismissible = input<boolean>(false);
  heading = input<string>('');
  additionalContent = input<string>('');
  linkText = input<string>('');
  linkUrl = input<string>('');

  dismissed = output<void>();

  getAlertClasses(): string {
    const classes = ['alert'];
    classes.push(`alert-${this.type()}`);

    if (this.icon() || this.heading()) {
      classes.push('d-flex');
    }

    if (this.dismissible()) {
      classes.push('alert-dismissible', 'fade', 'show');
    }

    if (this.additionalContent()) {
      classes.push('d-sm-flex', 'pb-4', 'pt-sm-4');
    }

    return classes.join(' ');
  }

  getIconClasses(): string {
    const classes = ['fi-' + this.icon()];

    if (this.heading()) {
      classes.push('fs-4', 'mt-1', 'mb-2', 'mb-sm-0');
    } else {
      classes.push('fs-lg', 'pe-1', 'mt-1', 'me-2');
    }

    return classes.join(' ');
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
