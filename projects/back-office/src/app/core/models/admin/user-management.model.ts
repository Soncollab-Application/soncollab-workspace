import { BackofficeUser } from '../auth.model';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: number;
  blocked?: boolean;
  confirmed?: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  preferred_language?: 'fr' | 'en';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: number;
  blocked?: boolean;
  confirmed?: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  preferred_language?: 'fr' | 'en';
  availability_status?: 'available' | 'busy' | 'out_of_office';
  territory?: string;
}

export interface GetUsersRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: UserFilters;
}

export interface UserFilters {
  username?: string;
  email?: string;
  role?: string;
  blocked?: boolean;
  confirmed?: boolean;
  availability_status?: string;
}

export interface SearchUsersRequest {
  query: string;
  fields?: string[];
  limit?: number;
}

export interface SearchUsersResponse {
  results: BackofficeUser[];
  total: number;
}
