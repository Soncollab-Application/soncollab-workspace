export interface HeroResponse {
  data: HeroData;
  meta: Record<string, any>;
}

export interface HeroData {
  id: number;
  documentId: string;
  title: string;
  subtitle: string;
  action_btn: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface Hero {
  id: number;
  documentId: string;
  title: string;
  subtitle: string;
  actionBtn: string;
  locale: string;
}
