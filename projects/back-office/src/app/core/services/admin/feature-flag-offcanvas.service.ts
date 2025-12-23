import { Injectable, signal } from '@angular/core';
import { FeatureFlag } from '../../models/admin/billing';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagOffcanvasService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _featureFlag = signal<FeatureFlag | null>(null);
  private _locale = signal<'fr' | 'en'>('fr');
  private _sourceDocumentId = signal<string | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  featureFlag = this._featureFlag.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();

  openCreate(locale: 'fr' | 'en' = 'fr', sourceDocumentId?: string): void {
    this._mode.set('create');
    this._featureFlag.set(null);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId || null);
    this._isOpen.set(true);
  }

  openEdit(featureFlag: FeatureFlag): void {
    this._mode.set('edit');
    this._featureFlag.set(featureFlag);
    this._locale.set(featureFlag.locale as 'fr' | 'en');
    this._sourceDocumentId.set(null);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    setTimeout(() => {
      this._featureFlag.set(null);
      this._mode.set('create');
      this._sourceDocumentId.set(null);
    }, 300);
  }
}
