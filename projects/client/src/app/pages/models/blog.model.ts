export interface BlogArticle {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: {
    url: string;
    alternativeText?: string;
    caption?: string;
    width?: number;
    height?: number;
  };
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  locale: string;
  author?: BlogAuthor;
  category?: BlogCategory;
  tags?: BlogTag[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    canonicalURL?: string;
  };
  isFeatured: boolean;
  readTime?: number;
}

export interface BlogCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  locale: string;
  articlesCount?: number;
}

export interface BlogTag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  locale: string;
  articlesCount?: number;
}

export interface BlogAuthor {
  id: number;
  name: string;
  bio?: string;
  avatar?: {
    url: string;
    alternativeText?: string;
  };
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

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

export interface SearchResult {
  data: BlogArticle[];
  meta: {
    total: number;
    query: string;
    type: string;
  };
}

export interface FeaturedContent {
  data: BlogArticle[];
  meta: {
    total: number;
    type: string;
  };
}

export interface RecentContent {
  data: BlogArticle[];
  meta: {
    total: number;
    type: string;
  };
}
