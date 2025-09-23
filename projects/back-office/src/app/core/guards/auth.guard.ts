import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    map(authState => authState.isAuthenticated),
    tap(isAuthenticated => {
      if (!isAuthenticated) {
        router.navigate(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
      }
    })
  );
};
