// --- MODÈLES DE BASE DE L'APPLICATION ---

export interface BlogAuthor {
  id: number;
  username?: string;
}

export interface BlogCategory {
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

export interface BlogTag {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  locale?: string;
  articlesCount?: number;
}

export interface BlogArticle {
  id: number;
  documentId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  publishedAt: string;
  createdAt: string;
  isFeatured: boolean;
  reading_time?: number;
  category?: BlogCategory;
  tags?: BlogTag[];
  author?: BlogAuthor;
  featured_image?: any | null;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  canonical_url?: string;
  locale?: string;
  localizations?: BlogArticleLocalization[];
}

export interface BlogArticleLocalization {
  id: number;
  locale: string;
  title: string;
  slug: string;
}

// --- STRUCTURES DE RÉPONSES GÉNÉRIQUES ---

export interface BlogResponse {
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

export interface SingleBlogResponse {
  data: BlogArticle;
}

export interface BlogCategoriesResponse {
  data: BlogCategory[];
}

export interface BlogTagsResponse {
  data: BlogTag[];
}


// Pour /api/blog-categories/slug/{slug}
export interface ApiCategoryResponse {
  data: {
    id: number;
    name: string;
    slug: string;
    articles: BlogArticle[];
  };
}

// Pour /api/blog-tags/slug/{slug}
export interface ApiTagResponse {
  data: {
    id: number;
    name: string;
    slug: string;
    articles: BlogArticle[];
  };
}

// Pour /api/content/search
export interface SearchResultItem extends BlogArticle {
  type: 'blog' | 'help';
  score: number;
}
export interface ApiSearchResponse {
  data: SearchResultItem[];
  meta: {
    query: string;
    total: number;
    type: string;
  };
}

// Pour /api/content/featured
export interface FeaturedBlog extends BlogArticle {
  type: 'blog';
}
export interface ApiFeaturedResponse {
  data: {
    blog: FeaturedBlog[];
    help: any[];
  };
}

// Pour /api/content/recent
export interface RecentBlog extends BlogArticle {
  type: 'blog';
}
export interface ApiRecentContentResponse {
  data: (RecentBlog | any)[];
}
