import { BillingCycle } from './subscription.model';

export type PaymentLinkStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface PaymentLink {
  id: number;
  documentId: string;
  link_token: string;
  link_url: string;
  link_status: PaymentLinkStatus;
  expires_at: string;
  accessed_at?: string;
  payment_completed_at?: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  plan_details: any;
  addons_details?: any[];
  pricing_details: any;
  billing_cycle: BillingCycle;
  total_amount: number;
  currency: string;
  payment_methods_allowed?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  sales_contact?: any;
  created_by?: any;
  subscription_transaction?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface PaymentLinkListItem {
  id: number;
  documentId: string;
  link_token: string;
  link_status: PaymentLinkStatus;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  expires_at: string;
  accessed_at?: string;
  payment_completed_at?: string;
  created_by_name?: string;
  createdAt: string;
}

export interface PaymentLinksResponse {
  data: PaymentLinkListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface PaymentLinkResponse {
  data: PaymentLink;
}

export interface PaymentLinkFilters {
  search?: string;
  link_status?: PaymentLinkStatus;
  created_by?: string;
  date_from?: string;
  date_to?: string;
}


export interface PaymentLinkDashboard {
  metrics: {
    total_links: number;
    active_links: number;
    converted_links: number;
    expired_links: number;
    conversion_rate: string;
    total_revenue: number;
    avg_deal_size: number;
  };
  links: PaymentLink[];
  action_items: {
    expiring_links: any[];
    stalled_contacts: any[];
  };
  period: string;
}


export interface PaymentLinkConversionStats {
  period: string;
  total_links_sent: number;
  links_accessed: number;
  links_converted: number;
  access_rate: string;
  conversion_rate: string;
  total_revenue: number;
  average_deal_size: number;
  by_status: Record<PaymentLinkStatus, number>;
}
