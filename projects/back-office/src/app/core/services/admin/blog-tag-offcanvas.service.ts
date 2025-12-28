import { Injectable, signal } from '@angular/core';
import { BlogTag } from '../../models/content/blog-tag.model';

@Injectable({
  providedIn: 'root',
})
export class BlogTagOffcanvasService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _tag = signal<BlogTag | null>(null);
  private _locale = signal<string>('fr');
  private _sourceDocumentId = signal<string | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  tag = this._tag.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();

  openCreate(locale: string = 'fr', sourceDocumentId?: string): void {
    this._mode.set('create');
    this._tag.set(null);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId || null);
    this._isOpen.set(true);
  }

  openEdit(tag: BlogTag): void {
    this._mode.set('edit');
    this._tag.set(tag);
    this._locale.set(tag.locale || 'fr');
    this._sourceDocumentId.set(null);
    this._isOpen.set(true);
  }

  open(tag?: BlogTag): void {
    if (tag) {
      this.openEdit(tag);
    } else {
      this.openCreate();
    }
  }

  close(): void {
    this._isOpen.set(false);
    setTimeout(() => {
      this._tag.set(null);
      this._mode.set('create');
      this._sourceDocumentId.set(null);
      this._locale.set('fr');
    }, 300);
  }
}
