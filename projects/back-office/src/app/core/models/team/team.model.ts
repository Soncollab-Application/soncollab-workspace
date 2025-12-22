import { BackofficeUser } from '../auth.model';
import {Subscription} from '../admin/billing';

export type TeamStatus = 'active' | 'suspended' | 'trial';

export interface Team {
  id: number;
  documentId: string;
  team_name: string;
  slug: string;
  owner?: BackofficeUser;
  logo?: any;
  is_white_label: boolean;
  team_status?: TeamStatus;
  subscriptions?: Subscription[];
  team_members?: any[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface TeamsResponse {
  data: Team[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface TeamResponse {
  data: Team;
}
