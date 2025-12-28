import { Injectable, signal } from '@angular/core';
import { BlogCategory } from '../../models/content/blog-category.model';

@Injectable({
  providedIn: 'root',
})
export class BlogCategoryOffcanvasService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _category = signal<BlogCategory | null>(null);
  private _locale = signal<string>('fr');
  private _sourceDocumentId = signal<string | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  category = this._category.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();

  openCreate(locale: string = 'fr', sourceDocumentId?: string): void {
    this._mode.set('create');
    this._category.set(null);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId || null);
    this._isOpen.set(true);
  }

  openEdit(category: BlogCategory): void {
    this._mode.set('edit');
    this._category.set(category);
    this._locale.set(category.locale || 'fr');
    this._sourceDocumentId.set(null);
    this._isOpen.set(true);
  }

  open(category?: BlogCategory): void {
    if (category) {
      this.openEdit(category);
    } else {
      this.openCreate();
    }
  }

  close(): void {
    this._isOpen.set(false);
    setTimeout(() => {
      this._category.set(null);
      this._mode.set('create');
      this._sourceDocumentId.set(null);
      this._locale.set('fr');
    }, 300);
  }
}
