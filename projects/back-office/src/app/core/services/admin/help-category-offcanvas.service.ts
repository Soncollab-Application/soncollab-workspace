import { Injectable, signal } from '@angular/core';
import { HelpCategory } from '../../models/content/help-category.model';

@Injectable({
  providedIn: 'root',
})
export class HelpCategoryOffcanvasService {
  isOpen = signal(false);
  mode = signal<'create' | 'edit'>('create');
  category = signal<HelpCategory | null>(null);

  open(category?: HelpCategory): void {
    if (category) {
      this.mode.set('edit');
      this.category.set(category);
    } else {
      this.mode.set('create');
      this.category.set(null);
    }
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    setTimeout(() => {
      this.category.set(null);
      this.mode.set('create');
    }, 300);
  }
}
