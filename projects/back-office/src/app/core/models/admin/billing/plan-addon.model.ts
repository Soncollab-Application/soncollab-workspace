import { FeatureFlag } from './feature-flag.model';

export interface PlanAddon {
  id: number;
  documentId: string;
  addon_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  visible_to_users: boolean;
  features_included?: FeatureFlag[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface PlanAddonListItem {
  id: number;
  documentId: string;
  addon_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  visible_to_users: boolean;
  features_included_count?: number;
  used_by_plans_count?: number;
  active_subscriptions_count?: number;
  createdAt: string;
  locale: string;
}

export interface PlanAddonsResponse {
  data: PlanAddonListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface PlanAddonResponse {
  data: PlanAddon;
}

export interface PlanAddonFilters {
  search?: string;
  is_active?: boolean;
  visible_to_users?: boolean;
}

export interface PlanAddonCreateRequest {
  addon_name: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
  visible_to_users: boolean;
  features_included?: string[];
  locale: 'en' | 'fr';
}

export interface PlanAddonUpdateRequest extends Partial<PlanAddonCreateRequest> {}

export interface PlanAddonStats {
  total: number;
  active: number;
  inactive: number;
  visible: number;
  hidden: number;
}
