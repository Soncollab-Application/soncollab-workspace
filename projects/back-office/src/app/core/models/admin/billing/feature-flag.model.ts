export type FeatureFlagStatus = 'stable' | 'beta' | 'deprecated';

export interface FeatureFlagLocalization {
  id: number;
  documentId: string;
  locale: string;
  name: string;
  publishedAt: string;
}

export interface FeatureFlag {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  feature_flag_status: FeatureFlagStatus;
  is_enabled_by_default: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
  localizations?: FeatureFlagLocalization[];
}

export interface FeatureFlagListItem {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  feature_flag_status: FeatureFlagStatus;
  is_enabled_by_default: boolean;
  used_by_plans_count?: number;
  used_by_addons_count?: number;
  createdAt: string;
  locale: string;
  localizations?: FeatureFlagLocalization[];
}

export interface FeatureFlagsResponse {
  data: FeatureFlagListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface FeatureFlagResponse {
  data: FeatureFlag;
}

export interface FeatureFlagFilters {
  search?: string;
  locale?: string;
  feature_flag_status?: FeatureFlagStatus;
  is_enabled_by_default?: boolean;
}

export interface FeatureFlagCreateRequest {
  name: string;
  description?: string;
  feature_flag_status: FeatureFlagStatus;
  is_enabled_by_default: boolean;
  locale: 'en' | 'fr';
}

export interface FeatureFlagUpdateRequest extends Partial<FeatureFlagCreateRequest> {}

export interface FeatureFlagStats {
  total: number;
  stable: number;
  beta: number;
  deprecated: number;
  enabled_by_default: number;
}
