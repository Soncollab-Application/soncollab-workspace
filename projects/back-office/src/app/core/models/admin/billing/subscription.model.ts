import { BillingPlan } from './billing-plan.model';
import { PlanAddon } from './plan-addon.model';
import {BackofficeUser} from '../../auth.model';
import {Team} from '../../team/team.model';

export type SubscriptionStatus = 'active' | 'cancelled' | 'paused' | 'trial';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriberType = 'user' | 'team';

export interface Subscription {
  id: number;
  documentId: string;
  subscriber_type: SubscriberType;
  subscriber_user?: BackofficeUser;
  subscriber_team?: Team;
  plan?: BillingPlan;
  addons?: PlanAddon[];
  start_date: string;
  end_date: string;
  subscription_status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  trial_end_date?: string;
  payment_provider_id?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface SubscriptionListItem {
  id: number;
  documentId: string;
  subscriber_type: SubscriberType;
  subscriber_name: string;
  subscriber_email: string;
  plan_name: string;
  plan_documentId: string;
  addons_count: number;
  start_date: string;
  end_date: string;
  subscription_status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  total_price?: number;
  currency_code?: string;
  days_until_expiry?: number;
  createdAt: string;
}

export interface SubscriptionDetail extends Subscription {
  quotas?: SubscriptionQuota[];
  usages?: any[];
  subscription_transactions?: any[];
  subscription_invoices?: any[];
}

export interface SubscriptionQuota {
  id: number;
  documentId: string;
  quota_type: string;
  max_value: number;
  current_usage: number;
  usage_percentage: number;
  is_over_quota: boolean;
  reset_period: 'monthly' | 'yearly';
  last_reset_date: string;
  next_reset_date: string;
}

export interface SubscriptionsResponse {
  data: SubscriptionListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface SubscriptionResponse {
  data: SubscriptionDetail;
}

export interface SubscriptionFilters {
  search?: string;
  subscription_status?: SubscriptionStatus;
  billing_cycle?: BillingCycle;
  plan?: string;
  subscriber_type?: SubscriberType;
}


export interface SubscriptionLifecycleStats {
  active: number;
  cancelled: number;
  trial: number;
  expiring_soon: number;
  total: number;
}


export interface SubscriptionUsageStats {
  total_subscriptions: number;
  total_quotas: number;
  quotas_over_limit: number;
  average_usage_percentage: number;
  by_quota_type: Record<string, {
    count: number;
    average_usage: number;
    over_limit: number;
  }>;
}


export interface SubscriptionQuotasResponse {
  data: SubscriptionQuota[];
  meta: {
    subscription_id: string;
    quota_count: number;
  };
}


export interface SubscriptionActivateRequest {
  transactionId: string;
}

export interface SubscriptionActivateResponse {
  data: {
    subscription: Subscription;
    user: {
      documentId: string;
      email: string;
      username: string;
    };
  };
  message: string;
}


export interface SubscriptionReactivateRequest {
  end_date: string;
}

export interface SubscriptionReactivateResponse {
  data: Subscription;
  message: string;
}

export interface SubscriptionExpireCheckResponse {
  expiring_soon: Subscription[];
  expired: Subscription[];
  notifications_sent: number;
}

export interface SubscriptionExpireProcessResponse {
  expired_count: number;
  updated_subscriptions: Subscription[];
}

export interface SubscriptionResetQuotasResponse {
  reset_count: number;
  affected_subscriptions: string[];
}
