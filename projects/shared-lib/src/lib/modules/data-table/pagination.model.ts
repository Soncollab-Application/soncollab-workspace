export interface PaginationMeta {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  total: number;
  pageCount: number;
}
