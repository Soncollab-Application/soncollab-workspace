export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'subscription' | 'addon' | 'upgrade' | 'refund';

export interface Invoice {
  id: number;
  documentId: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  invoice_status: InvoiceStatus;
  invoice_date: string;
  due_date?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  customer_details?: any;
  billing_address?: any;
  line_items?: any;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  pdf_file?: any;
  subscription?: any;
  subscription_transaction?: any;
  generated_by?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface InvoicesResponse {
  data: Invoice[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface InvoiceResponse {
  data: Invoice;
}


export interface InvoiceStats {
  total_invoices: number;
  by_status: Record<InvoiceStatus, number>;
  total_revenue: number;
  outstanding_amount: number;
  overdue_count: number;
}

export interface RecentInvoicesResponse {
  data: Invoice[];
  meta: {
    count: number;
  };
}
