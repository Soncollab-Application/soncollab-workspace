// pricing.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  PricingResponse,
  PricingPlan,
  GroupedPlans,
  PricingState,
  BillingPeriod
} from '../models/pricing.model';
import {LanguageService} from 'shared-lib';

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private readonly apiUrl = environment.api.fullUrl;

  // State management
  private pricingStateSubject = new BehaviorSubject<PricingState>({
    isLoading: false,
    data: null,
    selectedCurrency: 'USD',
    billingPeriod: 'monthly',
    selectedAddons: [],
    error: null
  });

  public pricingState$ = this.pricingStateSubject.asObservable();

  private languageService = inject(LanguageService);

  constructor(private httpClient: HttpClient) {}

  /**
   * Récupère les données de pricing depuis l'API Strapi
   */
  public getPricingData(locale?: string): Observable<PricingResponse> {
    const currentLocale = locale || this.languageService.getCurrentLanguage();

    this.updateState({ isLoading: true, error: null });

    return this.httpClient.get<PricingResponse>(`${this.apiUrl}/billing-plans/pricing/${currentLocale}`)
      .pipe(
        map(response => {
          this.updateState({
            data: response,
            isLoading: false
          });
          return response;
        }),
        catchError(this.handleError.bind(this)),
        finalize(() => {
          this.updateState({ isLoading: false });
        })
      );
  }

  /**
   * Groupe les plans par type de produit
   */
  public groupPlansByProductType(plans: PricingPlan[]): GroupedPlans {
    return plans.reduce((grouped: GroupedPlans, plan) => {
      const productType = plan.productType;
      if (!grouped[productType]) {
        grouped[productType] = [];
      }
      grouped[productType].push(plan);
      return grouped;
    }, {});
  }

  /**
   * Trie les plans par prix
   */
  public sortPlansByPrice(plans: PricingPlan[], billingPeriod: BillingPeriod = 'monthly'): PricingPlan[] {
    return [...plans].sort((a, b) => {
      const priceA = billingPeriod === 'monthly' ? a.priceMonthly : a.priceYearly;
      const priceB = billingPeriod === 'monthly' ? b.priceMonthly : b.priceYearly;
      return priceA - priceB;
    });
  }

  /**
   * Convertit un prix dans une devise donnée
   */
  public convertPrice(price: number, targetCurrencyCode: string, currencies: any[]): number {
    const targetCurrency = currencies.find(c => c.code === targetCurrencyCode);
    if (!targetCurrency) return price;

    return Math.round(price * targetCurrency.conversionRate);
  }

  /**
   * Calcule le prix total avec les addons sélectionnés
   */
  public calculateTotalPrice(
    basePlan: PricingPlan,
    selectedAddonIds: string[],
    allAddons: any[],
    billingPeriod: BillingPeriod = 'monthly'
  ): number {
    const basePrice = billingPeriod === 'monthly' ? basePlan.priceMonthly : basePlan.priceYearly;

    const addonsPrice = selectedAddonIds.reduce((total, addonId) => {
      const addon = allAddons.find(a => a.documentId === addonId);
      if (addon) {
        const addonPrice = billingPeriod === 'monthly' ? addon.priceMonthly : addon.priceYearly;
        return total + addonPrice;
      }
      return total;
    }, 0);

    return basePrice + addonsPrice;
  }

  /**
   * Met à jour la devise sélectionnée
   */
  public setSelectedCurrency(currencyCode: string): void {
    this.updateState({ selectedCurrency: currencyCode });
  }

  /**
   * Met à jour la période de facturation
   */
  public setBillingPeriod(period: BillingPeriod): void {
    this.updateState({ billingPeriod: period });
  }

  /**
   * Toggle un addon sélectionné
   */
  public toggleAddon(addonId: string): void {
    const currentState = this.pricingStateSubject.value;
    const selectedAddons = [...currentState.selectedAddons];

    const index = selectedAddons.indexOf(addonId);
    if (index > -1) {
      selectedAddons.splice(index, 1);
    } else {
      selectedAddons.push(addonId);
    }

    this.updateState({ selectedAddons });
  }

  /**
   * Réinitialise les addons sélectionnés
   */
  public clearSelectedAddons(): void {
    this.updateState({ selectedAddons: [] });
  }

  /**
   * Obtient l'état actuel
   */
  public getCurrentState(): PricingState {
    return this.pricingStateSubject.value;
  }

  /**
   * Met à jour l'état
   */
  private updateState(partialState: Partial<PricingState>): void {
    const currentState = this.pricingStateSubject.value;
    this.pricingStateSubject.next({
      ...currentState,
      ...partialState
    });
  }

  /**
   * Gère les erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue lors du chargement des données de pricing.';

    if (error.status === 0) {
      errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
    } else if (error.status === 404) {
      errorMessage = 'Données de pricing non trouvées.';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    this.updateState({ error: errorMessage });
    return throwError(() => new Error(errorMessage));
  }
}
