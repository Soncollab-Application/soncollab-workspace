import { BackofficeUser } from '../auth.model';

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled';
export type TargetRole = 'soncollab_admin' | 'soncollab_sales' | 'soncollab_content';
export type Department = 'admin' | 'sales' | 'marketing' | 'content' | 'support';

export interface Territory {
  id: number;
  documentId: string;
  territory_name: string;
  territory_code: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Country {
  id: number;
  documentId: string;
  name: string;
  code: string;
  phone_code: string;
  currency: string;
  timezone: string;
  flag?: string;
  languages: string[];
  continent?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface SoncollabInvitation {
  id: number;
  documentId: string;
  email: string;
  first_name: string;
  last_name: string;
  invitation_token?: string;
  preferred_language: 'fr' | 'en';
  invitation_status: InvitationStatus;
  target_role: TargetRole;
  department?: Department;
  sent_at?: string;
  accepted_at?: string;
  expires_at?: string;
  notes?: string;
  permissions?: Record<string, any>;
  invitation_context?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface InvitationListItem extends SoncollabInvitation {
  invited_by?: BackofficeUser;
  invited_user?: BackofficeUser;
  territory?: Territory;
  target_country?: Country;
}

export interface InvitationListResponse {
  data: InvitationListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface InvitationFilters {
  search?: string;
  status?: InvitationStatus;
  role?: TargetRole;
  department?: Department;
}

export interface InvitationStats {
  total: number;
  pending: number;
  sent: number;
  accepted: number;
  expired: number;
  cancelled: number;
  byRole: Record<TargetRole, number>;
  byDepartment: Record<Department, number>;
}

export interface RoleInfo {
  role: TargetRole;
  label: string;
  description: string;
  requiresTerritory: boolean;
  requiresDepartment: boolean;
  requiresCountry: boolean;
}

export interface InviteRequest {
  email: string;
  first_name: string;
  last_name: string;
  target_role: TargetRole;
  department?: Department;
  territory?: number;
  target_country?: number;
  notes?: string;
  preferred_language?: 'fr' | 'en';
}
