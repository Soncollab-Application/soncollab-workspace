import { Injectable, inject, signal } from '@angular/core';
import { OffcanvasService } from 'shared-lib';
import { HelpArticleOffcanvasData } from '../../../models/content/help-article-offcanvas.model';

export interface HelpArticleOffcanvasState {
  isOpen: boolean;
  data: HelpArticleOffcanvasData | null;
  onSuccess?: (articleId?: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class HelpArticleOffcanvasService {
  private offcanvasService = inject(OffcanvasService);

  private state = signal<HelpArticleOffcanvasState>({
    isOpen: false,
    data: null
  });

  getState = this.state.asReadonly();

  open(data: HelpArticleOffcanvasData, onSuccess?: (articleId?: string) => void): void {
    this.state.set({
      isOpen: true,
      data,
      onSuccess
    });

    this.offcanvasService.open({
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
