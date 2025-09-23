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
    loading: false,
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

  // Vérifier les rôles
  hasRole(role: SonCollabRoleType): boolean {
    return this.currentRole === role;
  }

  hasAnyRole(roles: SonCollabRoleType[]): boolean {
    return !!this.currentRole && roles.includes(this.currentRole);
  }

  isAdmin(): boolean {
    return this.hasRole('soncollab_admin');
  }

  isContent(): boolean {
    return this.hasRole('soncollab_content');
  }

  isSales(): boolean {
    return this.hasRole('soncollab_sales');
  }

  private initializeAuth(): void {
    const token = this.cookieService.getCookie(environment.auth.tokenKey);
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);

    if (token && refreshToken) {
      this.validateToken(token).subscribe({
        next: (user) => {
          this.setAuthState(user, token, refreshToken);
          this.startRefreshTimer();
        },
        error: () => {
          this.tryRefreshToken();
        }
      });
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

  private handleLoginSuccess(response: LoginResponse): void {
    const { jwt, refreshToken, user } = response;

    // Stocker dans les cookies sécurisés
    this.cookieService.setCookie(environment.auth.tokenKey, jwt, 1); // 1 jour
    this.cookieService.setCookie(environment.auth.refreshTokenKey, refreshToken, 30); // 30 jours

    this.setAuthState(user, jwt, refreshToken);
    this.startRefreshTimer();

    // Redirection selon le rôle
    this.redirectAfterLogin();
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
    return this.http.get<BackofficeUser>(`${this.AUTH_ENDPOINTS.me}?populate=role`, { headers })
      .pipe(
        map(response => response),
        catchError(() => throwError(() => new Error('Token invalide')))
      );
  }

  private tryRefreshToken(): void {
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);

    if (!refreshToken) {
      this.logout();
      return;
    }

    this.refreshToken().subscribe({
      next: (response) => {
        this.cookieService.setCookie(environment.auth.tokenKey, response.jwt, 1);
        this.cookieService.setCookie(environment.auth.refreshTokenKey, response.refreshToken, 30);

        this.validateToken(response.jwt).subscribe({
          next: (user) => {
            this.setAuthState(user, response.jwt, response.refreshToken);
            this.startRefreshTimer();
          },
          error: () => this.logout()
        });
      },
      error: () => this.logout()
    });
  }

  private refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.cookieService.getCookie(environment.auth.refreshTokenKey);

    return this.http.post<RefreshTokenResponse>(this.AUTH_ENDPOINTS.refresh, {
      refreshToken
    });
  }

  private startRefreshTimer(): void {
    this.clearRefreshTimer();
    // Renouveler le token toutes les 45 minutes (le JWT expire en 1h)
    this.refreshTimer = timer(45 * 60 * 1000).subscribe(() => {
      this.tryRefreshToken();
    });
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      this.refreshTimer.unsubscribe();
      this.refreshTimer = null;
    }
  }

  private redirectAfterLogin(): void {
    const role = this.currentRole;

    switch (role) {
      case 'soncollab_admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'soncollab_content':
        this.router.navigate(['/content/dashboard']);
        break;
      case 'soncollab_sales':
        this.router.navigate(['/sales/dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 400) {
      return 'Identifiants incorrects';
    } else if (error.status === 401) {
      return 'Accès non autorisé';
    } else if (error.status === 403) {
      return 'Compte bloqué ou non confirmé';
    } else if (error.status === 0) {
      return 'Impossible de contacter le serveur';
    } else {
      return 'Une erreur est survenue lors de la connexion';
    }
  }
}
