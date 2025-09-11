import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { ContactModalService } from '../../../../core/services/contact-modal.service';
import { LanguageOrchestratorService } from '../../../../core/services/language-orchestrator.service';
import { PricingService } from '../../../services/pricing.service';
import { ChoicesSelectComponent, SelectOption } from '../../../../core/modules/choices/choices-select.component';
import { ChoicesConfig } from '../../../../core/modules/choices/choices.directive';
import {
  PricingPlan,
  PricingAddon,
  PricingCurrency,
  BillingPeriod
} from '../../../models/pricing.model';

@Component({
  selector: 'app-pricing',
  imports: [CommonModule, FormsModule, TranslatePipe, ChoicesSelectComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private componentId = 'pricing';
  private hasInitialLoad = false;
  protected initialDataLoaded = false;
  private pendingParams: Params | null = null;

  // Services
  contactModalService = inject(ContactModalService);
  private pricingService = inject(PricingService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private translateService = inject(TranslateService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);

  // State
  public isLoading = false;
  public error: string | null = null;

  // Data
  public plans: PricingPlan[] = [];
  public addons: PricingAddon[] = [];
  public currencies: PricingCurrency[] = [];

  // Filters
  public selectedProductType: string = '';
  public selectedCurrency = '';
  public billingPeriod: BillingPeriod = 'monthly';
  public selectedAddons: string[] = [];

  // Options pour les dropdowns
  public productTypeOptions: SelectOption[] = [];
  public currencyOptions: SelectOption[] = [];

  // Configurations Choices
  public productTypeConfig: ChoicesConfig = {
    searchEnabled: false,
    itemSelectText: '',
    removeItemButton: false
  };

  public currencyConfig: ChoicesConfig = {
    searchEnabled: false,
    itemSelectText: '',
    removeItemButton: false
  };

  // Filtered plans
  public get filteredPlans(): PricingPlan[] {
    if (!this.selectedProductType) return [];

    let filtered = this.plans.filter(plan => plan.productType === this.selectedProductType);

    // Sort by price
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

    // S'enregistrer pour les changements de langue
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    // Charger les données initiales
    this.loadPricingData();

    // Configurer l'écoute des paramètres d'URL
    this.setupRouteListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }

  /**
   * Gère les changements de langue
   */
  private onLanguageChange(): void {
    if (this.hasInitialLoad) {
      this.loadPricingData();
    }
  }

  /**
   * Configure l'écoute des paramètres d'URL
   */
  private setupRouteListener(): void {
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (this.initialDataLoaded) {
          this.processRouteParams(params);
        } else {
          this.pendingParams = params;
        }
      });
  }

  /**
   * Traite les paramètres d'URL
   */
  private processRouteParams(params: Params): void {
    // Product Type
    if (params['productType'] && this.isValidProductType(params['productType'])) {
      this.selectedProductType = params['productType'];
    } else if (!this.selectedProductType && this.productTypeOptions.length > 0) {
      // Si aucun productType en URL et qu'on n'en a pas encore, prendre Studio par défaut
      this.selectedProductType = 'Studio';
    }

    // Currency
    if (params['currency'] && this.isValidCurrency(params['currency'])) {
      this.selectedCurrency = params['currency'];
    } else if (!this.selectedCurrency) {
      this.selectedCurrency = 'USD';
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
  }

  /**
   * Met à jour l'URL avec les paramètres actuels
   */
  private updateUrl(params: { [key: string]: string | string[] | undefined }): void {
    const currentParams = this.activatedRoute.snapshot.queryParams;
    const newParams = { ...currentParams, ...params };

    // Nettoyer les paramètres undefined
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === undefined || newParams[key] === null || newParams[key] === '') {
        delete newParams[key];
      }
    });

    // Supprimer les valeurs par défaut pour éviter l'encombrement d'URL
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

  /**
   * Charge les données depuis l'API
   */
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

          this.isLoading = false;
          this.initialDataLoaded = true;
          this.hasInitialLoad = true;

          // Traiter les paramètres en attente
          if (this.pendingParams) {
            this.processRouteParams(this.pendingParams);
            this.pendingParams = null;
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données pricing:', error);
          this.error = 'Erreur lors du chargement des données';
          this.isLoading = false;
          this.hasInitialLoad = true;
        }
      });
  }

  /**
   * Construit les options pour les dropdowns
   */
  private buildOptions(): void {
    // Product types
    const productTypes = [...new Set(this.plans.map(plan => plan.productType))].sort();
    this.productTypeOptions = productTypes.map(type => ({
      value: type,
      label: type
    }));

    // Currencies
    this.currencyOptions = this.currencies.map(currency => ({
      value: currency.code,
      label: this.getCurrencyLabel(currency)
    }));
  }

  /**
   * Définit les valeurs par défaut
   */
  private setDefaultValues(): void {
    if (!this.selectedProductType && this.productTypeOptions.length > 0) {
      this.selectedProductType = 'Studio'; // Valeur par défaut
    }
    if (!this.selectedCurrency) {
      this.selectedCurrency = 'USD'; // Valeur par défaut
    }
  }

  /**
   * Obtient le label formaté pour une devise
   */
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

  /**
   * Validation des paramètres d'URL
   */
  private isValidProductType(productType: string): boolean {
    return this.plans.some(plan => plan.productType === productType);
  }

  private isValidCurrency(currency: string): boolean {
    return this.currencies.some(c => c.code === currency);
  }

  private isValidAddon(addonId: string): boolean {
    return this.addons.some(addon => addon.documentId === addonId);
  }

  /**
   * Handlers pour les changements de filtres
   */
  public onProductTypeChange(productType: string): void {
    this.selectedProductType = productType;
    this.updateUrl({ productType: productType !== 'Studio' ? productType : undefined });
  }

  public onCurrencyChange(currency: string): void {
    this.selectedCurrency = currency;
    this.updateUrl({ currency: currency !== 'USD' ? currency : undefined });
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

  /**
   * Méthodes de calcul de prix (inchangées)
   */
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
    this.contactModalService.openContactModal().subscribe();
  }

  public selectPlan(plan: PricingPlan): void {
    console.log('Plan sélectionné:', plan);
    console.log('Addons sélectionnés:', this.selectedAddons);
    console.log('Prix total:', this.getTotalPrice(plan));
    console.log('URL actuelle:', this.router.url);
    // Ici vous pourriez rediriger vers une page de checkout
  }
}
