import { PaymentProvider } from './payment-method.model';

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type TransactionType = 'subscription_payment' | 'upgrade' | 'downgrade' | 'addon_purchase' | 'refund';

export interface Transaction {
  id: number;
  documentId: string;
  transaction_reference: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  transaction_status: TransactionStatus;
  payment_provider?: PaymentProvider;
  provider_transaction_id?: string;
  payment_method_details?: any;
  transaction_date: string;
  processed_date?: string;
  failure_reason?: string;
  customer_email: string;
  customer_name?: string;
  subscription?: any;
  sales_contact?: any;
  processed_by?: any;
  payment_method?: any;
  payment_link?: any;
  subscription_invoice?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface TransactionsResponse {
  data: TransactionListItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}




export interface TransactionListItem {
  id: number;
  documentId: string;
  transaction_reference: string;
  transaction_type: TransactionType;
  transaction_status: TransactionStatus;
  amount: number;
  currency: string;
  transaction_date: string;
  payment_provider?: PaymentProvider;
  customer_email: string;
  customer_name?: string;
  createdAt: string;
}

export interface TransactionFilters {
  search?: string;
  transaction_status?: TransactionStatus;
  transaction_type?: TransactionType;
  payment_provider?: PaymentProvider;
  date_from?: string;
  date_to?: string;
}

export interface TransactionStats {
  total_transactions: number;
  total_volume: number;
  by_status: Record<TransactionStatus, {
    count: number;
    total: number;
  }>;
  by_provider: Record<string, {
    count: number;
    total: number;
  }>;
  success_rate: string;
}

export interface TransactionResponse {
  data: Transaction;
}

export interface TransactionsStatsResponse {
  data: TransactionStats;
  meta: {
    period: string;
    generated_at: string;
  };
}
