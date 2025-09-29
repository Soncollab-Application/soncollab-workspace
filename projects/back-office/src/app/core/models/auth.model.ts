import {Image} from './api.model';
import {Country} from './country.model';

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  jwt: string;
  refreshToken: string;
  user: BackofficeUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  code: string;
  password: string;
  passwordConfirmation: string;
}

export interface ResetPasswordResponse {
  jwt: string;
  user: BackofficeUser;
}


export interface BackofficeUser {
  id: number;
  documentId: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  confirmed: boolean;
  blocked: boolean;
  availability_status: AvailabilityStatus;
  preferred_language: PreferredLanguage;
  bio: string;
  phone: string;
  timezone: string;
  avatar: Image;
  home_country: Country;
  territory: string;
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
  type: SonCollabRoleType;
}

export type SonCollabRoleType =
  | 'soncollab_admin'
  | 'soncollab_content'
  | 'soncollab_sales';

export type AvailabilityStatus =
  | 'available'
  | 'busy'
  | 'out_of_office';

export type PreferredLanguage =
  | 'fr'
  | 'en';

export interface AuthState {
  isAuthenticated: boolean;
  user: BackofficeUser | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}


export interface RefreshTokenResponse {
  jwt: string;
  refreshToken: string;
}
