// pricing.component.ts

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ContactModalService } from '../../../../core/services/contact-modal.service';
import { LanguageOrchestratorService } from '../../../../core/services/language-orchestrator.service';
import { PricingService } from '../../../services/pricing.service';
import {
  PricingPlan,
  PricingAddon,
  PricingCurrency,
  BillingPeriod
} from '../../../models/pricing.model';

@Component({
  selector: 'app-pricing',
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private componentId = 'pricing';
  private hasInitialLoad = false;

  // Services
  contactModalService = inject(ContactModalService);
  private pricingService = inject(PricingService);
  private languageOrchestrator = inject(LanguageOrchestratorService);

  // State
  public isLoading = false;
  public error: string | null = null;

  // Data
  public plans: PricingPlan[] = [];
  public addons: PricingAddon[] = [];
  public currencies: PricingCurrency[] = [];

  // Filters
  public selectedProductType: string = 'all';
  public selectedCurrency = 'USD';
  public billingPeriod: BillingPeriod = 'monthly';
  public selectedAddons: string[] = [];

  // Available product types
  public get productTypes(): string[] {
    const types = [...new Set(this.plans.map(plan => plan.productType))];
    return types.sort();
  }

  // Filtered plans
  public get filteredPlans(): PricingPlan[] {
    let filtered = this.plans;

    if (this.selectedProductType !== 'all') {
      filtered = filtered.filter(plan => plan.productType === this.selectedProductType);
    }

    // Sort by price
    return filtered.sort((a, b) => {
      const priceA = this.billingPeriod === 'monthly' ? a.priceMonthly : a.priceYearly;
      const priceB = this.billingPeriod === 'monthly' ? b.priceMonthly : b.priceYearly;
      return priceA - priceB;
    });
  }

  // Currency symbol
  public get currentCurrencySymbol(): string {
    const currency = this.currencies.find(c => c.code === this.selectedCurrency);
    return currency?.symbol || '$';
  }

  // Conversion rate
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

    this.loadPricingData();
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
          this.isLoading = false;
          this.hasInitialLoad = true;
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
   * Change le type de produit
   */
  public onProductTypeChange(event: Event): void {
    this.selectedProductType = (event.target as HTMLSelectElement).value;
  }

  /**
   * Change la devise
   */
  public onCurrencyChange(event: Event): void {
    this.selectedCurrency = (event.target as HTMLSelectElement).value;
  }

  /**
   * Change la période de facturation
   */
  public onBillingPeriodChange(event: Event): void {
    const isYearly = (event.target as HTMLInputElement).checked;
    this.billingPeriod = isYearly ? 'yearly' : 'monthly';
  }

  /**
   * Toggle un addon
   */
  public toggleAddon(addonId: string): void {
    const index = this.selectedAddons.indexOf(addonId);
    if (index > -1) {
      this.selectedAddons.splice(index, 1);
    } else {
      this.selectedAddons.push(addonId);
    }
  }

  /**
   * Vérifie si un addon est sélectionné
   */
  public isAddonSelected(addonId: string): boolean {
    return this.selectedAddons.includes(addonId);
  }

  /**
   * Convertit un prix dans la devise sélectionnée
   */
  public convertPrice(price: number): number {
    return Math.round(price * this.currentConversionRate);
  }

  /**
   * Obtient le prix affiché pour un plan
   */
  public getPlanPrice(plan: PricingPlan): number {
    const basePrice = this.billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    return this.convertPrice(basePrice);
  }

  /**
   * Obtient le prix affiché pour un addon
   */
  public getAddonPrice(addon: PricingAddon): number {
    const basePrice = this.billingPeriod === 'monthly' ? addon.priceMonthly : addon.priceYearly;
    return this.convertPrice(basePrice);
  }

  /**
   * Calcule le prix total d'un plan avec addons sélectionnés
   */
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

  /**
   * Calcule les économies pour l'abonnement annuel
   */
  public getYearlySavings(plan: PricingPlan): number {
    const monthlyTotal = this.convertPrice(plan.priceMonthly * 12);
    const yearlyPrice = this.convertPrice(plan.priceYearly);
    return monthlyTotal - yearlyPrice;
  }

  /**
   * Obtient la classe CSS pour le niveau de support
   */
  public getSupportLevelClass(level: string): string {
    const classMap: { [key: string]: string } = {
      'basic': 'badge bg-info',
      'priority': 'badge bg-warning',
      'premium': 'badge bg-success'
    };
    return classMap[level] || 'badge bg-secondary';
  }

  /**
   * Retourne à la liste des plans après erreur
   */
  public retryLoading(): void {
    this.loadPricingData();
  }

  /**
   * Ouvre le modal de contact
   */
  public openContactModal(): void {
    this.contactModalService.openContactModal().subscribe();
  }

  /**
   * Sélectionne un plan
   */
  public selectPlan(plan: PricingPlan): void {
    console.log('Plan sélectionné:', plan);
    console.log('Addons sélectionnés:', this.selectedAddons);
    console.log('Prix total:', this.getTotalPrice(plan));
    // Ici vous pourriez rediriger vers une page de checkout
  }

  /**
   * Nettoie les addons sélectionnés
   */
  public clearAddons(): void {
    this.selectedAddons = [];
  }
}
