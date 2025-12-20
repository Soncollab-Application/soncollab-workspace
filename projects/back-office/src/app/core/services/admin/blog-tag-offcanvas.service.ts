import { Injectable, signal } from '@angular/core';
import { BlogTag } from '../../models/content/blog-tag.model';

@Injectable({
  providedIn: 'root',
})
export class BlogTagOffcanvasService {
  isOpen = signal(false);
  mode = signal<'create' | 'edit'>('create');
  tag = signal<BlogTag | null>(null);

  open(tag?: BlogTag): void {
    if (tag) {
      this.mode.set('edit');
      this.tag.set(tag);
    } else {
      this.mode.set('create');
      this.tag.set(null);
    }
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    setTimeout(() => {
      this.tag.set(null);
      this.mode.set('create');
    }, 300);
  }
}
