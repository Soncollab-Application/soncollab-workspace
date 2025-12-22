export interface Currency {
  id: number;
  documentId: string;
  code: string;
  symbol: string;
  symbol_position: 'before' | 'after';
  conversion_rate: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface CurrencyListItem extends Currency {}

export interface CurrenciesResponse {
  data: Currency[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface CurrencyUpdateRequest {
  conversion_rate?: number;
  is_active?: boolean;
}
