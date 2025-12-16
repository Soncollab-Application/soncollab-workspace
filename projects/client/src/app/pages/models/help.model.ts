// --- MODÈLES DE BASE DE L'APPLICATION HELP ---

export interface HelpAuthor {
  id: number;
  username?: string;
}

export interface HelpCategory {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  locale?: string;
  articlesCount?: number;
}

export interface HelpArticle {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  publishedAt: string;
  isFeatured: boolean;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_reading_time?: number;
  category?: HelpCategory;
  author?: HelpAuthor;
  content_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'outdated';
  reviewed_by?: HelpAuthor;
  reviewed_at?: string;
  review_notes?: string;
  order: number;
  helpfulness_score: number;
  view_count: number;
  last_updated?: string;
  related_articles?: HelpArticle[];
  attachments?: any[];
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  search_keywords?: string;
  locale?: string;
  localizations?: HelpArticleLocalization[];
}


export interface HelpArticleLocalization {
  id: number;
  locale: string;
  title: string;
  slug: string;
}


// --- STRUCTURES DE RÉPONSES GÉNÉRIQUES ---

export interface HelpResponse {
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

export interface SingleHelpResponse {
  data: HelpArticle;
}

export interface HelpCategoriesResponse {
  data: HelpCategory[];
}

// Pour /api/help-categories/slug/{slug}
export interface ApiHelpCategoryResponse {
  data: {
    id: number;
    name: string;
    slug: string;
    articles: HelpArticle[];
  };
}

// Pour /api/content/search (articles d'aide inclus)
export interface SearchResultItemHelp extends HelpArticle {
  type: 'help';
  score: number;
}

export interface ApiHelpSearchResponse {
  data: SearchResultItemHelp[];
  meta: {
    query: string;
    total: number;
    type: string;
  };
}

// Pour /api/content/featured (articles d'aide inclus)
export interface FeaturedHelp extends HelpArticle {
  type: 'help';
}

export interface ApiHelpFeaturedResponse {
  data: {
    help: FeaturedHelp[];
  };
}

// Pour /api/content/recent (articles d'aide inclus)
export interface RecentHelp extends HelpArticle {
  type: 'help';
}

export interface ApiHelpRecentContentResponse {
  data: (RecentHelp | any)[];
}
