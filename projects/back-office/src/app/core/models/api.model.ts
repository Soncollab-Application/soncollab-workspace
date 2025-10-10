export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ApiError {
  data: null;
  error: {
    status: number;
    name: string;
    message: string;
    details: any;
  };
}


export interface Image {
  documentId: string;
  url?: string;
}
