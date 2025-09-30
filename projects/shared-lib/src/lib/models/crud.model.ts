import { Observable } from 'rxjs';
import { PaginatedResponse, PaginationParams } from './pagination.model';
import { FilterValue, SortConfig } from './filter.model';

export interface CrudOperations<T> {
  getAll(params?: QueryParams): Observable<PaginatedResponse<T>>;
  getOne(id: string): Observable<T>;
  create(data: Partial<T>): Observable<T>;
  update(id: string, data: Partial<T>): Observable<T>;
  delete(id: string): Observable<void>;
}

export interface QueryParams extends PaginationParams {
  filters?: FilterValue;
  sort?: SortConfig;
  search?: string;
}
