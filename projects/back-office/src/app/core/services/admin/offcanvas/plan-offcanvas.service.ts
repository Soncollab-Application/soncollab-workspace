import { Injectable, signal } from '@angular/core';
import { BillingPlanDetail } from '../../../models/admin/billing';

@Injectable({
  providedIn: 'root'
})
export class PlanOffcanvasService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _plan = signal<BillingPlanDetail | null>(null);
  private _locale = signal<'fr' | 'en'>('fr');
  private _sourceDocumentId = signal<string | null>(null);

  isOpen = this._isOpen.asReadonly();
  mode = this._mode.asReadonly();
  plan = this._plan.asReadonly();
  locale = this._locale.asReadonly();
  sourceDocumentId = this._sourceDocumentId.asReadonly();

  openCreate(locale: 'fr' | 'en' = 'fr', sourceDocumentId?: string): void {
    this._mode.set('create');
    this._plan.set(null);
    this._locale.set(locale);
    this._sourceDocumentId.set(sourceDocumentId || null);
    this._isOpen.set(true);
  }

  openEdit(plan: BillingPlanDetail): void {
    this._mode.set('edit');
    this._plan.set(plan);
    this._locale.set(plan.locale as 'fr' | 'en');
    this._sourceDocumentId.set(null);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    setTimeout(() => {
      this._plan.set(null);
      this._mode.set('create');
      this._sourceDocumentId.set(null);
    }, 300);
  }
}
