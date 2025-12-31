import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil, forkJoin, Observable} from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ToastService, Choice, ChoiceConfig, ChoiceOption } from 'shared-lib';
import { BillingService } from '../../../../services/admin/billing.service';
import { AddonOffcanvasService } from '../../../../services/admin/offcanvas/addon-offcanvas.service';
import {FeatureFlagListItem, Currency, PlanAddonResponse} from '../../../../models/admin/billing';

@Component({
  selector: 'app-addon-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, Choice, FormsModule],
  templateUrl: './addon-offcanvas.html',
  styleUrl: './addon-offcanvas.css'
})
export class AddonOffcanvas implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private billingService = inject(BillingService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);
  protected offcanvasService = inject(AddonOffcanvasService);

  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isSubmitting = signal(false);
  loadingData = signal(false);

  currencies = signal<Currency[]>([]);
  currencyOptions = signal<ChoiceOption[]>([]);
  selectedCurrency = signal<string>('');

  featureFlags = signal<FeatureFlagListItem[]>([]);
  featureFlagOptions = signal<ChoiceOption[]>([]);
  selectedFeatures = signal<string[]>([]);

  choiceConfig: ChoiceConfig = {
    searchEnabled: true,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false,
  };

  multipleChoiceConfig: ChoiceConfig = {
    searchEnabled: true,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: true,
  };

  selectedCurrencySymbol = computed(() => {
    const currencyId = this.selectedCurrency();
    const currency = this.currencies().find(c => c.documentId === currencyId);
    return currency?.symbol || '€';
  });

  selectedCurrencyPosition = computed(() => {
    const currencyId = this.selectedCurrency();
    const currency = this.currencies().find(c => c.documentId === currencyId);
    return currency?.symbol_position || 'left';
  });

  constructor() {
    this.form = this.fb.group({
      addon_name: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      price_monthly: [0, [Validators.required, Validators.min(0)]],
      price_yearly: [0, [Validators.required, Validators.min(0)]],
      is_active: [true],
      visible_to_users: [true]
    });

    effect(() => {
      const addon = this.offcanvasService.addon();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();

      if (isOpen && mode === 'edit' && addon) {
        this.loadReferenceData();

        this.form.patchValue({
          addon_name: addon.addon_name,
          description: addon.description || '',
          price_monthly: addon.price_monthly,
          price_yearly: addon.price_yearly,
          is_active: addon.is_active,
          visible_to_users: addon.visible_to_users
        });

        this.selectedCurrency.set(addon.currency?.documentId || '');

        const featureIds = addon.features_included?.map(f => f.documentId) || [];
        this.selectedFeatures.set(featureIds);
      } else if (isOpen && mode === 'create' && !this.offcanvasService.sourceDocumentId()) {
        this.loadReferenceData();
        this.resetForm();
      } else if (!isOpen) {
        this.resetForm();
      }
    });

    effect(() => {
      const sourceDocId = this.offcanvasService.sourceDocumentId();
      const sourceLocale = this.offcanvasService.sourceLocale();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();

      if (isOpen && mode === 'create' && sourceDocId) {
        this.billingService.getPlanAddon(sourceDocId, sourceLocale || undefined)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const sourceAddon = response.data;
              this.form.patchValue({
                addon_name: '',
                description: sourceAddon.description || '',
                price_monthly: sourceAddon.price_monthly,
                price_yearly: sourceAddon.price_yearly,
                is_active: sourceAddon.is_active,
                visible_to_users: sourceAddon.visible_to_users
              });

              this.selectedCurrency.set(sourceAddon.currency?.documentId || '');

              const featureIds = sourceAddon.features_included?.map(f => f.documentId) || [];
              this.selectedFeatures.set(featureIds);
            },
            error: (err) => {
              console.error('Error loading source addon:', err);
            }
          });
      }
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetForm(): void {
    this.form.reset({
      addon_name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      is_active: true,
      visible_to_users: true
    });

    this.selectedCurrency.set('');
    this.selectedFeatures.set([]);
    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  private loadReferenceData(): void {
    this.loadingData.set(true);

    forkJoin({
      currencies: this.billingService.getCurrencies(),
      featureFlags: this.billingService.getFeatureFlags()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          const activeCurrencies = results.currencies.data.filter(c => c.is_active);
          this.currencies.set(activeCurrencies);
          this.currencyOptions.set(
            activeCurrencies.map(currency => ({
              value: currency.documentId,
              label: `${currency.code} - ${currency.symbol}`
            }))
          );

          if (this.offcanvasService.mode() === 'create' && !this.selectedCurrency()) {
            const eurCurrency = activeCurrencies.find(c => c.code === 'EUR');
            if (eurCurrency) {
              this.selectedCurrency.set(eurCurrency.documentId);
            }
          }

          this.featureFlags.set(results.featureFlags.data);
          this.featureFlagOptions.set(
            results.featureFlags.data.map(feature => ({
              value: feature.documentId,
              label: feature.name
            }))
          );

          this.loadingData.set(false);
        },
        error: (err) => {
          console.error('Error loading reference data:', err);
          this.loadingData.set(false);
          this.toastService.showError(
            this.translate.instant('addon-offcanvas.error.loading_data')
          );
        }
      });
  }

  onCurrencyChange(value: string): void {
    this.selectedCurrency.set(value);
  }

  onFeaturesChange(values: string[]): void {
    this.selectedFeatures.set(values);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    if (!this.selectedCurrency()) {
      this.toastService.showError(
        this.translate.instant('addon-offcanvas.errors.currency_required')
      );
      return;
    }

    this.isSubmitting.set(true);

    const formData = {
      ...this.form.value,
      currency: this.selectedCurrency(),
      features_included: this.selectedFeatures().length > 0 ? this.selectedFeatures() : undefined
    };

    let request$: Observable<PlanAddonResponse>;

    if (this.offcanvasService.mode() === 'create') {
      if (this.offcanvasService.sourceDocumentId()) {
        request$ = this.billingService.updatePlanAddon(
          this.offcanvasService.sourceDocumentId()!,
          formData,
          this.offcanvasService.locale()
        );
      } else {
        formData.locale = this.offcanvasService.locale();
        request$ = this.billingService.createPlanAddon(formData);
      }
    } else {
      request$ = this.billingService.updatePlanAddon(
        this.offcanvasService.addon()!.documentId,
        formData,
        this.offcanvasService.locale()
      );
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'addon-offcanvas.success.created'
              : 'addon-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.close();
      },
      error: (err) => {
        console.error('Error saving addon:', err);
        this.toastService.showError(
          this.translate.instant('addon-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
