import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'lib-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  icon = input<string>('inbox');
  title = input.required<string>();
  message = input<string>('');
  actionLabel = input<string>('');
  actionIcon = input<string>('');

  action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
