export interface SalesQuota {
  id: number;
  documentId: string;
  quota_type: 'weekly' | 'monthly';
  max_contacts: number;
  current_contacts: number;
  priority_level: number;
  is_active: boolean;
  reset_date: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
