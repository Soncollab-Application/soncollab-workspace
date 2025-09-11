// pricing.model.ts

export interface PricingPlan {
  documentId: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  assetLimit: number;
  royaltyCap: number;
  supportLevel: 'basic' | 'priority' | 'premium';
  currency: PricingCurrency;
  productType: string;
  features: PricingFeature[];
  availableAddons: PricingAddon[];
}

export interface PricingFeature {
  name: string;
  description: string;
}

export interface PricingAddon {
  documentId: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PricingFeature[];
}

export interface PricingCurrency {
  documentId: string;
  code: string;
  symbol: string;
  symbol_position: 'left' | 'right';
  conversionRate: number;
}

export interface PricingResponse {
  success: boolean;
  locale: string;
  data: {
    plans: PricingPlan[];
    addons: PricingAddon[];
    currencies: PricingCurrency[];
  };
  meta: {
    timestamp: string;
    plansCount: number;
    addonsCount: number;
    currenciesCount: number;
  };
}

export interface GroupedPlans {
  [productType: string]: PricingPlan[];
}

export interface PricingState {
  isLoading: boolean;
  data: PricingResponse | null;
  selectedCurrency: string;
  billingPeriod: 'monthly' | 'yearly';
  selectedAddons: string[];
  error: string | null;
}

export type BillingPeriod = 'monthly' | 'yearly';
export type SupportLevel = 'basic' | 'priority' | 'premium';
