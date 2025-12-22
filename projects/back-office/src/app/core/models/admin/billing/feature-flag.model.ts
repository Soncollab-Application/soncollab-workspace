export interface FeatureFlag {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  is_active: boolean;
  feature_key?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface FeatureFlagListItem extends FeatureFlag {
  used_by_plans_count?: number;
  used_by_addons_count?: number;
}

export interface FeatureFlagsResponse {
  data: FeatureFlag[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface FeatureFlagUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}
