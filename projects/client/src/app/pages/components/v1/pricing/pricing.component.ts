import {Component, inject, OnInit, OnDestroy, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { ContactModalService } from '../../../../core/services/contact-modal.service';
import { PricingService } from '../../../services/pricing.service';
import {
  PricingPlan,
  PricingAddon,
  PricingCurrency,
  BillingPeriod
} from '../../../models/pricing.model';
import { Choice } from 'shared-lib';
import type { ChoiceOption, ChoiceConfig } from 'shared-lib';
import { ToastService, LanguageOrchestratorService } from 'shared-lib';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

@Component({
  selector: 'app-pricing',
  imports: [CommonModule, FormsModule, TranslatePipe, Choice],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private componentId = 'pricing';
  private hasInitialLoad = false;
  protected dataReady = signal<boolean>(false);
  private pendingParams: Params | null = null;
  private isProcessingRouteChange = false;

  // Subjects pour détecter les changements de modèle
  private productTypeChange$ = new Subject<string>();
  private currencyChange$ = new Subject<string>();

  // Services
  contactModalService = inject(ContactModalService);
  private pricingService = inject(PricingService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private translateService = inject(TranslateService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // State
  public isLoading = false;
  public error: string | null = null;

  // Data
  public plans: PricingPlan[] = [];
  public addons: PricingAddon[] = [];
  public currencies: PricingCurrency[] = [];

  // Filters avec setters pour détecter les changements
  private _selectedProductType: string = '';
  public get selectedProductType(): string {
    return this._selectedProductType;
  }
  public set selectedProductType(value: string) {
    if (this._selectedProductType !== value && !this.isProcessingRouteChange) {
      this._selectedProductType = value;
      this.productTypeChange$.next(value);
    } else {
      this._selectedProductType = value;
    }
  }

  private _selectedCurrency: string = '';
  public get selectedCurrency(): string {
    return this._selectedCurrency;
  }
  public set selectedCurrency(value: string) {
    if (this._selectedCurrency !== value && !this.isProcessingRouteChange) {
      this._selectedCurrency = value;
      this.currencyChange$.next(value);
    } else {
      this._selectedCurrency = value;
    }
  }

  public billingPeriod: BillingPeriod = 'monthly';
  public selectedAddons: string[] = [];

  // Options pour les dropdowns
  public productTypeOptions: ChoiceOption[] = [];
  public currencyOptions: ChoiceOption[] = [];

  // Configurations
  public productTypeConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    placeholder: true
  };

  public currencyConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    placeholder: true
  };

  // Filtered plans
  public get filteredPlans(): PricingPlan[] {
    if (!this.selectedProductType) return [];

    let filtered = this.plans.filter(plan => plan.productType === this.selectedProductType);

    return filtered.sort((a, b) => {
      const priceA = this.billingPeriod === 'monthly' ? a.priceMonthly : a.priceYearly;
      const priceB = this.billingPeriod === 'monthly' ? b.priceMonthly : b.priceYearly;
      return priceA - priceB;
    });
  }

  // Currency utilities
  public get currentCurrencySymbol(): string {
    const currency = this.currencies.find(c => c.code === this.selectedCurrency);
    return currency?.symbol || '$';
  }

  public get currentConversionRate(): number {
    const currency = this.currencies.find(c => c.code === this.selectedCurrency);
    return currency?.conversionRate || 1;
  }

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    // Écouter les changements de productType et currency
    this.setupModelChangeListeners();

    this.loadPricingData();
    this.setupRouteListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }

  private setupModelChangeListeners(): void {
    // Product Type
    this.productTypeChange$
      .pipe(
        debounceTime(100),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(productType => {
        this.updateUrl({ productType: productType !== 'Studio' ? productType : undefined });
      });

    // Currency
    this.currencyChange$
      .pipe(
        debounceTime(100),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(currency => {
        this.updateUrl({ currency: currency !== 'USD' ? currency : undefined });
      });
  }

  private onLanguageChange(): void {
    if (this.hasInitialLoad) {
      this.loadPricingData();
    }
  }

  private setupRouteListener(): void {
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (this.dataReady()) {
          this.processRouteParams(params);
        } else {
          this.pendingParams = params;
        }
      });
  }

  private processRouteParams(params: Params): void {
    if (this.isProcessingRouteChange) return;

    this.isProcessingRouteChange = true;

    // Product Type
    if (params['productType'] && this.isValidProductType(params['productType'])) {
      this._selectedProductType = params['productType'];
    } else if (!this._selectedProductType && this.productTypeOptions.length > 0) {
      this._selectedProductType = 'Studio';
    }

    // Currency
    if (params['currency'] && this.isValidCurrency(params['currency'])) {
      this._selectedCurrency = params['currency'];
    } else if (!this._selectedCurrency) {
      this._selectedCurrency = 'USD';
    }

    // Billing Period
    if (params['billing'] && ['monthly', 'yearly'].includes(params['billing'])) {
      this.billingPeriod = params['billing'] as BillingPeriod;
    }

    // Selected Addons
    if (params['addons']) {
      const addonsParam = Array.isArray(params['addons']) ? params['addons'] : [params['addons']];
      this.selectedAddons = addonsParam.filter((id: string) => this.isValidAddon(id));
    } else {
      this.selectedAddons = [];
    }

    setTimeout(() => {
      this.isProcessingRouteChange = false;
    }, 150);
  }

  private updateUrl(params: { [key: string]: string | string[] | undefined }): void {
    const currentParams = this.activatedRoute.snapshot.queryParams;
    const newParams = { ...currentParams, ...params };

    Object.keys(newParams).forEach(key => {
      if (newParams[key] === undefined || newParams[key] === null || newParams[key] === '') {
        delete newParams[key];
      }
    });

    if (newParams['productType'] === 'Studio') {
      delete newParams['productType'];
    }
    if (newParams['currency'] === 'USD') {
      delete newParams['currency'];
    }
    if (newParams['billing'] === 'monthly') {
      delete newParams['billing'];
    }
    if (Array.isArray(newParams['addons']) && newParams['addons'].length === 0) {
      delete newParams['addons'];
    }

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: newParams,
      replaceUrl: true
    });
  }

  private loadPricingData(): void {
    this.isLoading = true;
    this.error = null;

    this.pricingService.getPricingData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.plans = response.data.plans;
          this.addons = response.data.addons;
          this.currencies = response.data.currencies;

          this.buildOptions();
          this.setDefaultValues();

          setTimeout(() => {
            this.dataReady.set(true);
            this.isLoading = false;
            this.hasInitialLoad = true;

            if (this.pendingParams) {
              setTimeout(() => {
                this.processRouteParams(this.pendingParams!);
                this.pendingParams = null;
              }, 150);
            }
          }, 0);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données pricing:', error);
          this.error = this.translateService.instant('pricing.error.description');
          this.isLoading = false;
          this.hasInitialLoad = true;
        }
      });
  }

  private buildOptions(): void {
    const productTypes = [...new Set(this.plans.map(plan => plan.productType))].sort();
    this.productTypeOptions = productTypes.map(type => ({
      value: type,
      label: type
    }));

    this.currencyOptions = this.currencies.map(currency => ({
      value: currency.code,
      label: this.getCurrencyLabel(currency)
    }));
  }

  private setDefaultValues(): void {
    if (!this._selectedProductType && this.productTypeOptions.length > 0) {
      this._selectedProductType = 'Studio';
    }
    if (!this._selectedCurrency) {
      this._selectedCurrency = 'USD';
    }
  }

  private getCurrencyLabel(currency: PricingCurrency): string {
    const labelMap: { [key: string]: string } = {
      'XOF': `${currency.code} - Franc CFA (${currency.symbol})`,
      'CAD': `${currency.code} - Dollar Canadien (${currency.symbol})`,
      'EUR': `${currency.code} - Euro (${currency.symbol})`,
      'GBP': `${currency.code} - Livre Sterling (${currency.symbol})`,
      'USD': `${currency.code} - Dollar US (${currency.symbol})`
    };
    return labelMap[currency.code] || `${currency.code} (${currency.symbol})`;
  }

  private isValidProductType(productType: string): boolean {
    return this.plans.some(plan => plan.productType === productType);
  }

  private isValidCurrency(currency: string): boolean {
    return this.currencies.some(c => c.code === currency);
  }

  private isValidAddon(addonId: string): boolean {
    return this.addons.some(addon => addon.documentId === addonId);
  }

  public onBillingPeriodChange(event: Event): void {
    const isYearly = (event.target as HTMLInputElement).checked;
    this.billingPeriod = isYearly ? 'yearly' : 'monthly';
    this.updateUrl({ billing: this.billingPeriod !== 'monthly' ? this.billingPeriod : undefined });
  }

  public toggleAddon(addonId: string): void {
    const index = this.selectedAddons.indexOf(addonId);
    if (index > -1) {
      this.selectedAddons.splice(index, 1);
    } else {
      this.selectedAddons.push(addonId);
    }

    this.updateUrl({
      addons: this.selectedAddons.length > 0 ? this.selectedAddons : undefined
    });
  }

  public isAddonSelected(addonId: string): boolean {
    return this.selectedAddons.includes(addonId);
  }

  public clearAddons(): void {
    this.selectedAddons = [];
    this.updateUrl({ addons: undefined });
  }

  // Méthodes de calcul de prix (identiques)
  public convertPrice(price: number): number {
    const convertedPrice = Math.round(price * this.currentConversionRate);

    if (this.selectedCurrency === 'XOF') {
      return Math.round(convertedPrice / 100) * 100;
    }

    return convertedPrice;
  }

  public formatPriceWithSymbol(price: number): string {
    const convertedPrice = this.convertPrice(price);
    const formattedNumber = this.selectedCurrency === 'XOF'
      ? convertedPrice.toLocaleString('fr-FR')
      : convertedPrice.toLocaleString('en-US');

    const symbol = this.currentCurrencySymbol;
    const currency = this.currencies.find(c => c.code === this.selectedCurrency);
    const position = currency?.symbol_position || 'left';

    if (position === 'left') {
      return `${symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${symbol}`;
    }
  }

  public formatConvertedPriceWithSymbol(convertedPrice: number): string {
    const formattedNumber = this.selectedCurrency === 'XOF'
      ? convertedPrice.toLocaleString('fr-FR')
      : convertedPrice.toLocaleString('en-US');

    const symbol = this.currentCurrencySymbol;
    const currency = this.currencies.find(c => c.code === this.selectedCurrency);
    const position = currency?.symbol_position || 'left';

    if (position === 'left') {
      return `${symbol}${formattedNumber}`;
    } else {
      return `${formattedNumber} ${symbol}`;
    }
  }

  public getPlanPrice(plan: PricingPlan): number {
    const basePrice = this.billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    return this.convertPrice(basePrice);
  }

  public getAddonPrice(addon: PricingAddon): number {
    const basePrice = this.billingPeriod === 'monthly' ? addon.priceMonthly : addon.priceYearly;
    return this.convertPrice(basePrice);
  }

  public getTotalPrice(plan: PricingPlan): number {
    let total = this.getPlanPrice(plan);

    for (const addonId of this.selectedAddons) {
      const addon = this.addons.find(a => a.documentId === addonId);
      if (addon) {
        total += this.getAddonPrice(addon);
      }
    }

    return total;
  }

  public getYearlySavings(plan: PricingPlan): number {
    const monthlyTotal = this.convertPrice(plan.priceMonthly * 12);
    const yearlyPrice = this.convertPrice(plan.priceYearly);
    return monthlyTotal - yearlyPrice;
  }

  public getSupportLevelClass(level: string): string {
    const classMap: { [key: string]: string } = {
      'basic': 'badge bg-info',
      'priority': 'badge bg-warning',
      'premium': 'badge bg-success'
    };
    return classMap[level] || 'badge bg-secondary';
  }

  public retryLoading(): void {
    this.loadPricingData();
  }

  public openContactModal(): void {
    this.contactModalService.openContactModal()
      .subscribe({
        next: (result) => {
          if (!result.cancelled) {
            this.toastService.showSuccess(
              this.translateService.instant('contact.form.success'),
              {
                header: this.translateService.instant('contact.form.success.title'),
                delay: 5000
              }
            );
          }
        },
        error: (error) => {
          console.error('Erreur lors de l\'envoi:', error);
        }
      });
  }

  public contactForPricing(plan?: PricingPlan): void {
    let prefilledMessage = '';

    if (plan) {
      prefilledMessage = this.translateService.instant('pricing.contact.interested', {
        plan: plan.name
      });

      prefilledMessage += `\n\n--- ${this.translateService.instant('pricing.contact.planDetails')} ---\n`;
      prefilledMessage += `${this.translateService.instant('pricing.plan')}: ${plan.name}\n`;

      const billingPeriodLabel = this.billingPeriod === 'monthly'
        ? this.translateService.instant('pricing.monthly')
        : this.translateService.instant('pricing.yearly');

      prefilledMessage += `${this.translateService.instant('pricing.billingPeriod')}: ${billingPeriodLabel}\n`;

      if (this.selectedAddons.length > 0) {
        const addonNames = this.selectedAddons.map(id => {
          const addon = this.addons.find(a => a.documentId === id);
          return addon?.name || id;
        });
        prefilledMessage += `${this.translateService.instant('pricing.addons.selected')}: ${addonNames.join(', ')}\n`;
      }

      const estimatedPrice = this.getTotalPrice(plan);
      prefilledMessage += `${this.translateService.instant('pricing.estimatedPrice')}: ${this.formatConvertedPriceWithSymbol(estimatedPrice)}\n`;
    } else {
      prefilledMessage = this.translateService.instant('pricing.contact.general');
    }

    const initialData = {
      contact_type: 'pricing_inquiry',
      message: prefilledMessage,
      contact_subject: plan
        ? this.translateService.instant('pricing.contact.subject.plan', { plan: plan.name })
        : this.translateService.instant('pricing.contact.subject.general'),
      source: 'pricing_page',
      isPricingInquiry: true
    };

    this.contactModalService.openContactModal(initialData)
      .subscribe({
        next: (result) => {
          // Géré par le modal
        },
        error: (error) => {
          console.error('Erreur lors de l\'envoi:', error);
        }
      });
  }

  public selectPlan(plan: PricingPlan): void {
    this.contactForPricing(plan);
  }
}
