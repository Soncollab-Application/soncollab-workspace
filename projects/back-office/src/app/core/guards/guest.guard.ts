import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    map(authState => {
      const isGuest = !authState.isAuthenticated;

      if (!isGuest) {
        redirectAuthenticatedUser(authService.currentRole, router);
        return false;
      }

      return true;
    })
  );
};

function redirectAuthenticatedUser(currentRole: string | null, router: Router): void {
  switch (currentRole) {
    case 'soncollab_admin':
      router.navigate(['/admin/dashboard']);
      break;
    case 'soncollab_content':
      router.navigate(['/content/dashboard']);
      break;
    case 'soncollab_sales':
      router.navigate(['/sales/dashboard']);
      break;
    default:
      router.navigate(['/']);
  }
}
