export interface BlogArticleStats {
  draft: number;
  pending_review: number;
  approved: number;
  published: number;
}

export interface HelpArticleStats {
  draft: number;
  pending_review: number;
  approved: number;
  published: number;
}

export interface ContentStatsResponse {
  data: {
    blog: BlogArticleStats;
    help: HelpArticleStats;
    total: {
      draft: number;
      pending_review: number;
      approved: number;
      published: number;
    };
  };
  meta: {
    generated_at: string;
  };
}

// Stats par langue
export interface LocaleStatsResponse {
  locale: string;
  stats: ContentStatsResponse;
}
