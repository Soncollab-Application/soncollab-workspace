import { Injectable, inject, signal } from '@angular/core';
import { OffcanvasService } from 'shared-lib';
import { BlogArticleOffcanvasData } from '../../models/content/blog-article-offcanvas.model';

export interface BlogArticleOffcanvasState {
  isOpen: boolean;
  data: BlogArticleOffcanvasData | null;
  onSuccess?: (articleId?: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class BlogArticleOffcanvasService {
  private offcanvasService = inject(OffcanvasService);

  private state = signal<BlogArticleOffcanvasState>({
    isOpen: false,
    data: null
  });

  getState = this.state.asReadonly();

  open(data: BlogArticleOffcanvasData, onSuccess?: (articleId?: string) => void): void {
    this.state.set({
      isOpen: true,
      data,
      onSuccess
    });

    this.offcanvasService.open({
      placement: 'end',
      backdrop: 'static',
      keyboard: false,
      scroll: false
    });
  }

  close(): void {
    this.offcanvasService.close();
    this.state.set({
      isOpen: false,
      data: null
    });
  }
}
