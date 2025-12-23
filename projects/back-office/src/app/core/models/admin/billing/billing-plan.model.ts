import { Currency } from './currency.model';
import { ProductType } from './product-type.model';
import { FeatureFlag } from './feature-flag.model';
import { PlanAddon } from './plan-addon.model';

export const AVAILABLE_LOCALES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export type SupportLevel = 'basic' | 'priority' | 'premium';

export interface BillingPlanLocalization {
  id: number;
  documentId: string;
  locale: string;
  plan_name: string;
  publishedAt: string;
}

export interface BillingPlan {
  id: number;
  documentId: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap: number | null;
  support_level: SupportLevel;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
  currency?: Currency;
  product_type?: ProductType;
  included_features?: FeatureFlag[];
  available_addons?: PlanAddon[];
  localizations?: BillingPlanLocalization[];
}

export interface BillingPlanListItem {
  id: number;
  documentId: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap: number | null;
  support_level: SupportLevel;
  is_active: boolean;
  locale: string;
  currency: {
    code: string;
    symbol: string;
  } | null;
  product_type: {
    name: string;
  } | null;
  included_features: Array<{ name: string }>;
  available_addons: Array<{ addon_name: string }>;
  localizations?: BillingPlanLocalization[];
  createdAt: string;
}

export interface SubscriptionSummary {
  id: number;
  documentId: string;
  subscriber_user: {
    username: string;
    email: string;
  } | null;
  subscriber_team: {
    team_name: string;
  } | null;
  subscription_status: string;
  start_date: string;
  end_date: string;
  billing_cycle: 'monthly' | 'yearly';
}

export interface BillingPlanDetail {
  id: number;
  documentId: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap: number | null;
  support_level: SupportLevel;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
  currency: Currency;
  product_type: ProductType;
  included_features: FeatureFlag[];
  available_addons: PlanAddon[];
  subscriptions: SubscriptionSummary[];
  localizations?: BillingPlanLocalization[];
  statistics: {
    total_revenue: number;
    active_subscriptions: number;
    monthly_recurring_revenue: number;
    annual_recurring_revenue: number;
  };
}

export interface BillingPlanFilters {
  search?: string;
  locale?: string;
  product_type?: string;
  currency?: string;
  is_active?: boolean;
  support_level?: SupportLevel;
  price_range?: 'low' | 'medium' | 'high';
}

export interface CreateBillingPlanRequest {
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap?: number;
  support_level: SupportLevel;
  is_active: boolean;
  currency: string;
  product_type?: string;
  included_features?: string[];
  available_addons?: string[];
  locale: 'en' | 'fr';
}

export interface UpdateBillingPlanRequest extends Partial<CreateBillingPlanRequest> {}

export interface BillingPlansResponse {
  data: BillingPlanListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface BillingPlanResponse {
  data: BillingPlanDetail;
}

export interface BillingPlanStats {
  total: number;
  active: number;
  inactive: number;
  by_support_level: {
    basic: number;
    priority: number;
    premium: number;
  };
  by_product_type: Record<string, number>;
  total_potential_revenue: number;
}
