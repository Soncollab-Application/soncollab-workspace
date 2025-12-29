import { Injectable, signal } from '@angular/core';
import { PlanAddon } from '../../../models/admin/billing';

@Injectable({
  providedIn: 'root'
})
export class AddonOffcanvasService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _addon = signal<PlanAddon | null>(null);
  private _locale = signal<'fr' | 'en'>('fr');
  private _sourceDocumentId = signal<string | null>(null);
  private _sourceLocale = signal<string | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  addon = this._addon.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();
  sourceLocale = this._sourceLocale.asReadonly();

  openCreate(locale: 'fr' | 'en' = 'fr', sourceDocumentId?: string, sourceLocale?: string): void {
    this._mode.set('create');
    this._addon.set(null);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId || null);
    this._sourceLocale.set(sourceLocale || null);
    this._isOpen.set(true);
  }

  openEdit(addon: PlanAddon): void {
    this._mode.set('edit');
    this._addon.set(addon);
    this._locale.set(addon.locale as 'fr' | 'en');
    this._sourceDocumentId.set(null);
    this._sourceLocale.set(null);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    setTimeout(() => {
      this._addon.set(null);
      this._mode.set('create');
      this._sourceDocumentId.set(null);
      this._sourceLocale.set(null);
    }, 300);
  }
}
