import { BackofficeUser } from '../auth.model';

export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'outdated';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ContentBase {
  id: number;
  documentId: string;
  content_status: ContentStatus;
  author?: BackofficeUser;
  reviewed_by?: BackofficeUser;
  reviewed_at?: string;
  review_notes?: string;
  is_featured: boolean;
  view_count: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ContentFilters {
  search?: string;
  status?: ContentStatus;
  author?: string;
  is_featured?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface ContentStats {
  total: number;
  by_status: {
    draft: number;
    pending_review: number;
    approved: number;
    rejected: number;
    outdated?: number;
  };
  by_author: {
    [email: string]: number;
  };
  pending_reviews: number;
  approval_rate: number;
}
