import { Injectable, inject, signal } from '@angular/core';
import { OffcanvasService } from 'shared-lib';
import {BlogCategory} from '../../../models/content/blog-category.model';

@Injectable({
  providedIn: 'root'
})
export class BlogCategoryOffcanvasService {
  private offcanvasService = inject(OffcanvasService);

  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _category = signal<BlogCategory | null>(null);
  private _locale = signal<string>('fr');
  private _sourceDocumentId = signal<string | null>(null);
  private _onSuccess = signal<(() => void) | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  category = this._category.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();

  open(
    mode: 'create' | 'edit',
    category: BlogCategory | null = null,
    locale: string = 'fr',
    sourceDocumentId: string | null = null,
    onSuccess?: () => void
  ): void {
    this._mode.set(mode);
    this._category.set(category);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId);
    this._onSuccess.set(onSuccess || null);
    this._isOpen.set(true);

    this.offcanvasService.open({
      backdrop: 'static',
      keyboard: false,
      scroll: false
    });
  }

  close(): void {
    this.offcanvasService.close();
    this._isOpen.set(false);
    this._mode.set('create');
    this._category.set(null);
    this._locale.set('fr');
    this._sourceDocumentId.set(null);
    this._onSuccess.set(null);
  }

  triggerSuccess(): void {
    const callback = this._onSuccess();
    if (callback) {
      callback();
    }
  }
}
