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
  firstName: string;
  lastName: string;
  role: UserRole;
  confirmed: boolean;
  blocked: boolean;
  preferredLanguage: string;
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
