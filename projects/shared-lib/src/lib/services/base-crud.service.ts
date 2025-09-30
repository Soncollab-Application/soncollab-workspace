import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {PaginatedResponse, QueryParams} from '../models';

export abstract class BaseCrudService<T> {
  protected http = inject(HttpClient);
  protected abstract apiUrl: string;

  getAll(params?: QueryParams): Observable<PaginatedResponse<T>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.page) {
        httpParams = httpParams.set('pagination[page]', params.page.toString());
      }
      if (params.pageSize) {
        httpParams = httpParams.set('pagination[pageSize]', params.pageSize.toString());
      }
      if (params.search) {
        httpParams = httpParams.set('filters[$or][0][name][$containsi]', params.search);
      }
      if (params.sort) {
        httpParams = httpParams.set(`sort[0]`, `${params.sort.field}:${params.sort.direction}`);
      }
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            httpParams = httpParams.set(`filters[${key}]`, value);
          }
        });
      }
    }

    return this.http.get<PaginatedResponse<T>>(this.apiUrl, { params: httpParams });
  }

  getOne(id: string): Observable<{ data: T }> {
    return this.http.get<{ data: T }>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<T>): Observable<{ data: T }> {
    return this.http.post<{ data: T }>(this.apiUrl, { data });
  }

  update(id: string, data: Partial<T>): Observable<{ data: T }> {
    return this.http.put<{ data: T }>(`${this.apiUrl}/${id}`, { data });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
