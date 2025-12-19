export interface BlogTag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  color: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  articles?: any[];
  articlesCount?: number;
  localizations?: { id: number; locale: string }[];
}

export interface BlogTagListResponse {
  data: BlogTag[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface BlogTagFilters {
  search?: string;
  locale?: string;
}
