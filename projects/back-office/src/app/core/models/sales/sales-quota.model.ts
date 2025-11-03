import { BackofficeUser } from '../auth.model';
import { Country } from '../admin/invitation.model';

export type QuotaType = 'weekly' | 'monthly';

export interface SalesQuota {
  id: number;
  documentId: string;
  quota_type: QuotaType;
  max_contacts: number;
  current_contacts: number;
  priority_level: number;
  is_active: boolean;
  reset_date: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;

  // Relations
  sales_rep?: BackofficeUser;
  target_countries?: Country[];
}

export interface SalesQuotaListResponse {
  data: SalesQuota[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface QuotaFilters {
  search?: string;
  quota_type?: QuotaType;
  is_active?: boolean;
  sales_rep?: string;
}

export interface TerritoryQuota {
  reps_count: number;
  total_capacity: number;
  total_current: number;
  avg_load: number;
}

export interface LoadDistribution {
  overloaded: number;
  high_load: number;
  normal_load: number;
  low_load: number;
}

export interface QuotaStats {
  total_reps: number;
  quotas_by_territory: Record<string, TerritoryQuota>;
  load_distribution: LoadDistribution;
  avg_load_percentage: number;
}
