import { HelpArticle } from './help-article.model';

export interface HelpArticleOffcanvasData {
  mode: 'create' | 'edit' | 'view';
  articleId?: string;
  locale: string;
  sourceDocumentId?: string;
}

export interface HelpArticleOffcanvasResult {
  action: 'saved' | 'cancelled';
  article?: HelpArticle;
}
