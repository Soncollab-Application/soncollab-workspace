export interface ProductType {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface ProductTypesResponse {
  data: ProductType[];
}
