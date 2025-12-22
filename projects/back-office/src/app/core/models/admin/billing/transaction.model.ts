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
  data: Transaction[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
