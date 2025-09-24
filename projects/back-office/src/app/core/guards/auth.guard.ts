// auth.guard.ts - CORRIGÉ
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, tap, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    filter(authState => !authState.loading),
    take(1),
    map(authState => {
      if (authState.isAuthenticated) {
        return true;
      } else {
        router.navigate(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }
    })
  );
};
