import { Country, Territory } from '../admin/invitation.model';
import { BackofficeUser } from '../auth.model';

export type ContactType = 'label' | 'distributor' | 'artist' | 'manager' | 'publisher' | 'pricing_inquiry' | 'other';

export type SalesContactStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'interested'
  | 'demo_scheduled'
  | 'demo_completed'
  | 'proposal_sent'
  | 'negotiation'
  | 'converted'
  | 'lost';

export type CompanySize =
  | 'micro_1_10'
  | 'small_11_50'
  | 'medium_51_200'
  | 'large_201_500'
  | 'enterprise_500_plus';

export type UrgencyLevel = 'low' | 'normal' | 'high' | 'urgent';

export type AssignmentType =
  | 'inbound_auto'
  | 'inbound_manual'
  | 'outbound'
  | 'reassigned';

export interface ConvertedTeam {
  id: number;
  documentId: string;
  name: string;
}

export interface SalesContact {
  id: number;
  documentId: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  company_website?: string;
  phone?: string;
  contact_type: ContactType;
  message?: string;
  sales_contact_status: SalesContactStatus;
  contact_subject?: string;
  previous_contact_count: number;
  lead_score: number;
  company_size?: CompanySize;
  estimated_annual_revenue?: number | null;
  qualification_date?: string | null;
  conversion_date?: string | null;
  assignment_type: AssignmentType;
  prospection_notes?: string | null;
  notes?: string | null;
  urgency_level: UrgencyLevel;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;

  // Relations - Réutilisation des modèles existants
  assigned_to?: BackofficeUser | null;
  sales_interactions?: SalesInteraction[];
  converted_user?: BackofficeUser | null;
  converted_team?: ConvertedTeam | null;
  territory_assigned?: Territory | null;
  country?: Country | null;
  subscription_transactions?: any[];
  payment_links?: any[];
}

export interface SalesContactListResponse {
  data: SalesContact[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ContactFilters {
  search?: string;
  status?: SalesContactStatus;
  contact_type?: ContactType;
  urgency?: UrgencyLevel;
  assigned?: boolean;
  territory?: string;
  company_size?: CompanySize;
  assignment_type?: AssignmentType;
}

export interface ContactStats {
  pipeline: {
    [status: string]: number;
  };
  assignment: {
    total_contacts: number;
    assigned_contacts: number;
    unassigned_contacts: number;
    assignment_rate: string;
    contacts_by_rep: {
      [email: string]: number;
    };
  };
  total_contacts: number;
  converted_contacts: number;
  conversion_rate: string;
  contacts_by_type: {
    [type: string]: number;
  };
}

export interface ContactFormOptions {
  contact_types: Array<{ value: string; label: string }>;
  company_sizes: Array<{ value: string; label: string }>;
  urgency_levels: Array<{ value: string; label: string }>;
  countries: Array<{ value: string; label: string }>;
  language: string;
  meta: {
    total_countries: number;
    countries_by_continent: Record<string, number>;
    last_updated: string;
  };
}

// ========== SALES INTERACTION ==========

export type InteractionType =
  | 'email'
  | 'phone_call'
  | 'video_call'
  | 'demo'
  | 'meeting'
  | 'website_form'
  | 'linkedin_message'
  | 'follow_up'
  | 'proposal_sent'
  | 'payment_link';

export type InteractionOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'no_response'
  | 'meeting_scheduled'
  | 'demo_scheduled'
  | 'proposal_requested'
  | 'converted';

export type NextAction =
  | 'follow_up_call'
  | 'send_email'
  | 'schedule_demo'
  | 'send_proposal'
  | 'wait_for_response'
  | 'close_lost'
  | 'convert_to_customer';

export interface SalesInteraction {
  id: number;
  documentId: string;
  interaction_type: InteractionType;
  interaction_date: string;
  duration_minutes?: number;
  subject: string;
  notes: string;
  outcome?: InteractionOutcome;
  next_action?: NextAction;
  next_action_date?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;

  // Relations
  sales_contact?: SalesContact;
  performed_by?: BackofficeUser;
  attachments?: any[];
}

export interface SalesInteractionListResponse {
  data: SalesInteraction[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface InteractionFilters {
  search?: string;
  interaction_type?: InteractionType;
  outcome?: InteractionOutcome;
  performed_by?: string;
  date_from?: string;
  date_to?: string;
}
