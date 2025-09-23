import {Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  setCookie(name: string, value: string, days: number = 30): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

    const cookieValue = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
    const domain = environment.auth.cookieDomain ? `; domain=${environment.auth.cookieDomain}` : '';
    const secure = environment.auth.cookieSecure ? '; secure' : '';
    const sameSite = `; samesite=${environment.auth.cookieSameSite}`;

    document.cookie = cookieValue + domain + secure + sameSite;
  }

  getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  deleteCookie(name: string): void {
    const domain = environment.auth.cookieDomain ? `; domain=${environment.auth.cookieDomain}` : '';
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domain}`;
  }

  deleteAllAuthCookies(): void {
    this.deleteCookie(environment.auth.tokenKey);
    this.deleteCookie(environment.auth.refreshTokenKey);
  }
}
