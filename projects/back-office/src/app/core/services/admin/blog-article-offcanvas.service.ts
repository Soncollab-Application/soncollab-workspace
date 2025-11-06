import { Injectable, inject } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {BlogArticleOffcanvasData, BlogArticleOffcanvasResult} from '../../models/content/blog-article-offcanvas.model';

@Injectable({
  providedIn: 'root'
})
export class BlogArticleOffcanvasService {
  private dataSubject = new BehaviorSubject<BlogArticleOffcanvasData | null>(null);
  private resultSubject = new BehaviorSubject<BlogArticleOffcanvasResult | null>(null);

  data$ = this.dataSubject.asObservable();
  result$ = this.resultSubject.asObservable();

  open(data: BlogArticleOffcanvasData): Observable<BlogArticleOffcanvasResult> {
    this.dataSubject.next(data);

    return new Observable(observer => {
      const subscription = this.result$.subscribe(result => {
        if (result) {
          observer.next(result);
          observer.complete();
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  close(result: BlogArticleOffcanvasResult): void {
    this.resultSubject.next(result);
    setTimeout(() => {
      this.dataSubject.next(null);
      this.resultSubject.next(null);
    }, 300);
  }
}
