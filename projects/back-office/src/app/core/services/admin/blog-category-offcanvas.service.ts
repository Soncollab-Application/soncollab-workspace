import { Injectable, signal } from '@angular/core';
import { BlogCategory } from '../../models/content/blog-category.model';

@Injectable({
  providedIn: 'root',
})
export class BlogCategoryOffcanvasService {
  isOpen = signal(false);
  mode = signal<'create' | 'edit'>('create');
  category = signal<BlogCategory | null>(null);

  open(category?: BlogCategory): void {
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
