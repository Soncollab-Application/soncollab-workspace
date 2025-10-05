import {SalesQuota} from '../sales/sales-quota.model';
import {BackofficeUser} from '../auth.model';

export interface UserListItem extends BackofficeUser {
  sales_quotas: SalesQuota[];
  subscriptions: any[];
}

export interface UsersListResponse {
  data: UserListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'available' | 'busy' | 'offline';
  blocked?: boolean;
  confirmed?: boolean;
}
