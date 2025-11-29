import {ContentBase, ContentFilters, DifficultyLevel} from './content-common.model';
import { HelpCategory } from './help-category.model';
import { BackofficeUser } from '../auth.model';


export interface HelpArticleLocalization {
  id: number;
  documentId: string;
  locale: string;
  title: string;
  publishedAt: string;
}


export interface HelpArticle extends ContentBase {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category?: HelpCategory;
  difficulty_level: DifficultyLevel;
  estimated_reading_time?: number;
  order: number;
  helpfulness_score: number;
  last_updated?: string;
  related_articles?: HelpArticle[];
  attachments?: {
    id: number;
    url: string;
    name: string;
  }[];
  author?: BackofficeUser;
  reviewed_by?: BackofficeUser;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  search_keywords?: string;
  locale?: string;
  localizations?: HelpArticleLocalization[];
}

export interface HelpArticleListResponse {
  data: HelpArticle[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface HelpArticleFilters extends ContentFilters {
  category?: string;
  difficulty?: DifficultyLevel;
  locale?: string;
  content_status?: string;
}
