import {ContentBase, ContentFilters} from './content-common.model';
import {BlogCategory} from './blog-category.model';
import {BlogTag} from './blog-tag.model';
import {BackofficeUser} from '../auth.model';

export interface BlogArticle extends ContentBase {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: {
    id: number;
    url: string;
    name: string;
    alternativeText?: string;
  };
  category?: BlogCategory;
  tags?: BlogTag[];
  author?: BackofficeUser;
  reviewed_by?: BackofficeUser;
  scheduled_publish_at?: string;
  reading_time?: number;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  allow_comments: string | boolean;
  og_image?: {
    id: number;
    url: string;
  };
  locale?: string;
  localizations?: BlogArticleLocalization[]; // Autres versions linguistiques
}

export interface BlogArticleLocalization {
  id: number;
  documentId: string;
  locale: string;
  title: string;
  publishedAt: string;
}

export interface BlogArticleListResponse {
  data: BlogArticle[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface BlogArticleFilters extends ContentFilters {
  category?: string;
  tags?: string[];
  locale?: string;
}

// Configuration des langues disponibles
export interface LocaleConfig {
  code: string;
  label: string;
  flag: string;
}

export const AVAILABLE_LOCALES: LocaleConfig[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];
