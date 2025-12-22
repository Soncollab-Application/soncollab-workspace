import { Currency } from './currency.model';
import { ProductType } from './product-type.model';
import { FeatureFlag } from './feature-flag.model';
import { PlanAddon } from './plan-addon.model';

export type SupportLevel = 'basic' | 'priority' | 'premium';

export interface BillingPlan {
  id: number;
  documentId: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap: number;
  support_level: SupportLevel;
  is_active: boolean;
  currency?: Currency;
  product_type?: ProductType;
  included_features?: FeatureFlag[];
  available_addons?: PlanAddon[];
  subscriptions?: any[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface BillingPlanListItem {
  id: number;
  documentId: string;
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  support_level: SupportLevel;
  is_active: boolean;
  currency_code?: string;
  currency_symbol?: string;
  product_type_name?: string;
  features_count?: number;
  addons_count?: number;
  subscriptions_count?: number;
  createdAt: string;
}

export interface BillingPlanDetail extends BillingPlan {
  total_revenue?: number;
  active_subscriptions?: number;
}

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

export interface BillingPlanFilters {
  search?: string;
  product_type?: string;
  currency?: string;
  is_active?: boolean;
  support_level?: SupportLevel;
}

export interface BillingPlanCreateRequest {
  plan_name: string;
  price_monthly: number;
  price_yearly: number;
  asset_limit: number;
  royalty_cap: number;
  support_level: SupportLevel;
  is_active: boolean;
  currency: string;
  product_type: string;
  included_features?: string[];
  available_addons?: string[];
}

export interface BillingPlanUpdateRequest extends Partial<BillingPlanCreateRequest> {}

export interface BillingPlanStats {
  total: number;
  active: number;
  inactive: number;
  total_revenue_potential: number;
  by_product_type: Record<string, number>;
  by_support_level: Record<SupportLevel, number>;
}
