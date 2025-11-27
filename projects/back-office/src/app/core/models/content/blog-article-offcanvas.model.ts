import {BlogArticle} from './blog-article.model';

export interface BlogArticleOffcanvasData {
  mode: 'create' | 'edit' | 'view';
  articleId?: string;
  locale: string;
  sourceDocumentId?: string;
}

export interface BlogArticleOffcanvasResult {
  action: 'saved' | 'cancelled';
  article?: BlogArticle;
}
