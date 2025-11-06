export interface BlogCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  is_featured: boolean;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  articles?: any[];
  articlesCount?: number;
}

export interface BlogCategoryListResponse {
  data: BlogCategory[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface BlogCategoryFilters {
  locale?: string;
  is_featured?: boolean;
  search?: string;
}
