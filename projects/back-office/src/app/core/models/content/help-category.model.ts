export interface HelpCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  order: number;
  parent_category?: HelpCategory;
  sub_categories?: HelpCategory[];
  locale?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  articles?: any[];
  articlesCount?: number;
  localizations?: HelpCategory[];
}

export interface HelpCategoryListResponse {
  data: HelpCategory[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface HelpCategoryFilters {
  search?: string;
  parent_only?: boolean;
  locale?: string;
}
