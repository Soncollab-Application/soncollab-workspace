export type PaymentProvider = 'stripe' | 'fedapay';

export interface PaymentMethod {
  id: number;
  documentId: string;
  method_name: string;
  provider: PaymentProvider;
  provider_config?: any;
  supported_currencies?: string[];
  supported_countries?: string[];
  is_active: boolean;
  is_default: boolean;
  priority_order: number;
  min_amount?: number;
  max_amount?: number;
  processing_fee_percentage?: number;
  processing_fee_fixed?: number;
  webhook_url?: string;
  webhook_secret?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface PaymentMethodsResponse {
  data: PaymentMethod[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface PaymentProviderHealth {
  [provider: string]: {
    status: 'healthy' | 'degraded' | 'down';
    response_time: number;
    last_check: string;
    error?: string;
  };
}

export interface PaymentProviderStats {
  providers: {
    [provider: string]: {
      total_transactions: number;
      completed_transactions: number;
      failed_transactions: number;
      pending_transactions: number;
      total_amount: number;
      success_rate: string;
      average_transaction: number;
    };
  };
  global: {
    total_transactions: number;
    completed_transactions: number;
    failed_transactions: number;
    pending_transactions: number;
    total_amount: number;
    success_rate: string;
    average_transaction: number;
  };
}
