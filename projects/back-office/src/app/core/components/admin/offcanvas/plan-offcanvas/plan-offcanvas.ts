import { Component, inject, signal, effect, OnDestroy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ToastService, Choice, ChoiceOption, ChoiceConfig } from 'shared-lib';
import { PlanOffcanvasService } from '../../../../services/admin/offcanvas/plan-offcanvas.service';
import { BillingService } from '../../../../services/admin/billing.service';
import {
  SupportLevel,
  Currency,
  ProductType,
  PlanAddonListItem, FeatureFlag, FeatureFlagListItem
} from '../../../../models/admin/billing';

@Component({
  selector: 'app-plan-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, Choice],
  templateUrl: './plan-offcanvas.html',
  styleUrl: './plan-offcanvas.css',
})
export class PlanOffcanvas implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  protected offcanvasService = inject(PlanOffcanvasService);
  private billingService = inject(BillingService);
  private toastService = inject(ToastService);
  protected translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  form: FormGroup;
  isSubmitting = signal(false);
  loadingData = signal(false);

  currencies = signal<Currency[]>([]);
  productTypes = signal<ProductType[]>([]);
  featureFlags = signal<FeatureFlagListItem[]>([]);
  planAddons = signal<PlanAddonListItem[]>([]);

  currencyOptions = signal<ChoiceOption[]>([]);
  productTypeOptions = signal<ChoiceOption[]>([]);
  supportLevelOptions = signal<ChoiceOption[]>([]);
  featureFlagOptions = signal<ChoiceOption[]>([]);
  addonOptions = signal<ChoiceOption[]>([]);

  selectedCurrency = signal<string>('');
  selectedProductType = signal<string>('');
  selectedSupportLevel = signal<SupportLevel>('basic');
  selectedFeatures = signal<string[]>([]);
  selectedAddons = signal<string[]>([]);

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

  constructor() {
    this.form = this.fb.group({
      plan_name: ['', [Validators.required, Validators.maxLength(100)]],
      price_monthly: [0, [Validators.required, Validators.min(0)]],
      price_yearly: [0, [Validators.required, Validators.min(0)]],
      asset_limit: [1000, [Validators.required, Validators.min(1)]],
      royalty_cap: [null],
      is_active: [true]
    });

    // Initialiser les options de support level
    this.supportLevelOptions.set([
      { value: 'basic', label: this.translate.instant('plans-list.support_levels.basic') },
      { value: 'priority', label: this.translate.instant('plans-list.support_levels.priority') },
      { value: 'premium', label: this.translate.instant('plans-list.support_levels.premium') }
    ]);

    // ========== EFFECT 1: EDIT MODE ==========
    effect(() => {
      const plan = this.offcanvasService.plan();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();

      if (isOpen && mode === 'edit' && plan) {
        this.loadReferenceData();

        this.form.patchValue({
          plan_name: plan.plan_name,
          price_monthly: plan.price_monthly,
          price_yearly: plan.price_yearly,
          asset_limit: plan.asset_limit,
          royalty_cap: plan.royalty_cap,
          is_active: plan.is_active
        });

        this.selectedCurrency.set(plan.currency?.documentId || '');
        this.selectedProductType.set(plan.product_type?.documentId || '');
        this.selectedSupportLevel.set(plan.support_level);

        const featureIds = plan.included_features?.map(f => f.documentId) || [];
        this.selectedFeatures.set(featureIds);

        const addonIds = plan.available_addons?.map(a => a.documentId) || [];
        this.selectedAddons.set(addonIds);
      } else if (isOpen && mode === 'create' && !this.offcanvasService.sourceDocumentId()) {
        this.loadReferenceData();
        this.resetForm();
      } else if (!isOpen) {
        this.resetForm();
      }
    });

    // ========== EFFECT 2: CREATE TRANSLATION MODE ==========
    effect(() => {
      const sourceDocId = this.offcanvasService.sourceDocumentId();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();

      if (isOpen && mode === 'create' && sourceDocId) {
        this.billingService.getBillingPlan(sourceDocId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const sourcePlan = response.data;
              this.form.patchValue({
                plan_name: '',
                price_monthly: sourcePlan.price_monthly,
                price_yearly: sourcePlan.price_yearly,
                asset_limit: sourcePlan.asset_limit,
                royalty_cap: sourcePlan.royalty_cap,
                is_active: sourcePlan.is_active
              });

              this.selectedCurrency.set(sourcePlan.currency?.documentId || '');
              this.selectedProductType.set(sourcePlan.product_type?.documentId || '');
              this.selectedSupportLevel.set(sourcePlan.support_level);

              const featureIds = sourcePlan.included_features?.map(f => f.documentId) || [];
              this.selectedFeatures.set(featureIds);

              const addonIds = sourcePlan.available_addons?.map(a => a.documentId) || [];
              this.selectedAddons.set(addonIds);
            },
            error: (err) => {
              console.error('Error loading source plan:', err);
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
      plan_name: '',
      price_monthly: 0,
      price_yearly: 0,
      asset_limit: 1000,
      royalty_cap: null,
      is_active: true
    });

    this.selectedCurrency.set('');
    this.selectedProductType.set('');
    this.selectedSupportLevel.set('basic');
    this.selectedFeatures.set([]);
    this.selectedAddons.set([]);

    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  private loadReferenceData(): void {
    this.loadingData.set(true);

    forkJoin({
      currencies: this.billingService.getCurrencies(),
      productTypes: this.billingService.getProductTypes(),
      featureFlags: this.billingService.getFeatureFlags(),
      planAddons: this.billingService.getPlanAddons(1, 100)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          // Currencies
          const activeCurrencies = results.currencies.data.filter(c => c.is_active);
          this.currencies.set(activeCurrencies);
          this.currencyOptions.set(
            activeCurrencies.map(currency => ({
              value: currency.documentId,
              label: `${currency.code} - ${currency.symbol}`
            }))
          );

          // Si mode création et pas de currency sélectionnée, prendre EUR par défaut
          if (this.offcanvasService.mode() === 'create' && !this.selectedCurrency()) {
            const eurCurrency = activeCurrencies.find(c => c.code === 'EUR');
            if (eurCurrency) {
              this.selectedCurrency.set(eurCurrency.documentId);
            }
          }

          // Product Types
          this.productTypes.set(results.productTypes.data);
          this.productTypeOptions.set(
            results.productTypes.data.map(type => ({
              value: type.documentId,
              label: type.name
            }))
          );

          // Feature Flags
          this.featureFlags.set(results.featureFlags.data);
          this.featureFlagOptions.set(
            results.featureFlags.data.map(feature => ({
              value: feature.documentId,
              label: feature.name
            }))
          );

          // Plan Addons
          const activeAddons = results.planAddons.data.filter(a => a.is_active);
          this.planAddons.set(activeAddons);
          this.addonOptions.set(
            activeAddons.map(addon => ({
              value: addon.documentId,
              label: addon.addon_name
            }))
          );

          this.loadingData.set(false);
        },
        error: (err) => {
          console.error('Error loading reference data:', err);
          this.loadingData.set(false);
          this.toastService.showError(
            this.translate.instant('plan-offcanvas.error.loading_data')
          );
        }
      });
  }

  onCurrencyChange(value: string): void {
    this.selectedCurrency.set(value);
  }

  onProductTypeChange(value: string): void {
    this.selectedProductType.set(value);
  }

  onSupportLevelChange(value: string): void {
    this.selectedSupportLevel.set(value as SupportLevel);
  }

  onFeaturesChange(values: string[]): void {
    this.selectedFeatures.set(values);
  }

  onAddonsChange(values: string[]): void {
    this.selectedAddons.set(values);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    if (!this.selectedCurrency()) {
      this.toastService.showError(
        this.translate.instant('plan-offcanvas.errors.currency_required')
      );
      return;
    }

    this.isSubmitting.set(true);

    const formData = {
      ...this.form.value,
      currency: this.selectedCurrency(),
      product_type: this.selectedProductType() || undefined,
      support_level: this.selectedSupportLevel(),
      included_features: this.selectedFeatures().length > 0 ? this.selectedFeatures() : undefined,
      available_addons: this.selectedAddons().length > 0 ? this.selectedAddons() : undefined,
      locale: this.offcanvasService.locale()
    };

    const request$ =
      this.offcanvasService.mode() === 'create'
        ? this.billingService.createBillingPlan(formData)
        : this.billingService.updateBillingPlan(
          this.offcanvasService.plan()!.documentId,
          formData
        );

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'plan-offcanvas.success.created'
              : 'plan-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.close();
      },
      error: (err) => {
        console.error('Error saving plan:', err);
        this.toastService.showError(
          this.translate.instant('plan-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
