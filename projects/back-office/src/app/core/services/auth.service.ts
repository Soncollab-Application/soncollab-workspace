// auth.service.ts - VERSION PROPRE
import {Injectable} from '@angular/core';
import {BehaviorSubject, catchError, map, Observable, tap, throwError, timer} from 'rxjs';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {CookieService} from './cookie.service';
import {
  AuthState,
  BackofficeUser,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  SonCollabRoleType
} from '../models/auth.model';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.api.fullUrl;
  private readonly AUTH_ENDPOINTS = {
    login: `${this.API_URL}/auth/local`,
    me: `${this.API_URL}/users/me`,
    refresh: `${this.API_URL}/auth/local/refresh`
  };

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    loading: true,
    error: null
  });

  private refreshTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService
  ) {
    this.initializeAuth();
  }

  get authState$(): Observable<AuthState> {
    return this.authStateSubject.asObservable();
  }

  get currentUser(): BackofficeUser | null {
    return this.authStateSubject.value.user;
  }

  get isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  get currentRole(): SonCollabRoleType | null {
    return this.currentUser?.role?.type || null;
  }

  hasRole(role: SonCollabRoleType): boolean {
    return this.currentRole === role;
  }

  hasAnyRole(roles: SonCollabRoleType[]): boolean {
    return !!this.currentRole && roles.includes(this.currentRole);
  }

  private initializeAuth(): void {
    const token = this.cookieService.getCookie(environment.auth.tokenKey);
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);

    if (token && refreshToken && token !== 'undefined' && refreshToken !== 'undefined') {
      this.validateToken(token).subscribe({
        next: (user) => {
          this.setAuthState(user, token, refreshToken);
        },
        error: () => {
          this.tryRefreshToken();
        }
      });
    } else {
      this.updateAuthState({ loading: false });
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.updateAuthState({ loading: true, error: null });

    return this.http.post<LoginResponse>(this.AUTH_ENDPOINTS.login, credentials)
      .pipe(
        tap((response) => {
          this.handleLoginSuccess(response);
        }),
        catchError((error: HttpErrorResponse) => {
          this.updateAuthState({
            loading: false,
            error: this.getErrorMessage(error)
          });
          return throwError(() => error);
        })
      );
  }

  private handleLoginSuccess(response: LoginResponse): void {
    const { jwt, refreshToken, user } = response;

    this.cookieService.setCookie(environment.auth.tokenKey, jwt, 1);
    this.cookieService.setCookie(environment.auth.refreshTokenKey, refreshToken || jwt, 30);

    this.setAuthState(user, jwt, refreshToken || jwt);
  }

  private setAuthState(user: BackofficeUser, token: string, refreshToken: string): void {
    this.updateAuthState({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
      loading: false,
      error: null
    });
  }

  private updateAuthState(partialState: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...partialState });
  }

  private validateToken(token: string): Observable<BackofficeUser> {
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${this.AUTH_ENDPOINTS.me}?populate=role`;

    return this.http.get<BackofficeUser>(url, { headers })
      .pipe(
        map(response => response),
        catchError(() => throwError(() => new Error('Token invalide')))
      );
  }

  private tryRefreshToken(): void {
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);

    if (!refreshToken || refreshToken === 'undefined') {
      this.logout();
      return;
    }

    this.refreshTokenCall().subscribe({
      next: (response) => {
        this.cookieService.setCookie(environment.auth.tokenKey, response.jwt, 1);
        this.cookieService.setCookie(environment.auth.refreshTokenKey, response.refreshToken, 30);

        this.validateToken(response.jwt).subscribe({
          next: (user) => {
            this.setAuthState(user, response.jwt, response.refreshToken);
          },
          error: () => this.logout()
        });
      },
      error: () => {
        this.logout();
      }
    });
  }

  private refreshTokenCall(): Observable<RefreshTokenResponse> {
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);
    return this.http.post<RefreshTokenResponse>(this.AUTH_ENDPOINTS.refresh, { refreshToken });
  }

  logout(): void {
    this.clearRefreshTimer();
    this.cookieService.deleteAllAuthCookies();
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null
    });
    this.router.navigate(['/auth/login']);
  }

  private startRefreshTimer(): void {
    this.refreshTimer = timer(50 * 60 * 1000).subscribe(() => {
      this.tryRefreshToken();
    });
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      this.refreshTimer.unsubscribe();
      this.refreshTimer = null;
    }
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 400:
        return 'Identifiants invalides';
      case 401:
        return 'Email ou mot de passe incorrect';
      case 500:
        return 'Erreur serveur';
      default:
        return 'Erreur de connexion';
    }
  }
}
