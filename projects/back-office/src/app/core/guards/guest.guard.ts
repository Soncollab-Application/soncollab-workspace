// guest.guard.ts - Ajoute des logs
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    filter(authState => !authState.loading),
    take(1),
    map(authState => {
      if (authState.isAuthenticated) {
        // Vérifier s'il y a un returnUrl
        const returnUrl = route.queryParams?.['returnUrl'];

        if (returnUrl) {
          router.navigateByUrl(returnUrl);
        } else {
          // Redirection selon le rôle
          const role = authState.user?.role?.type;

          switch (role) {
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
        return false;
      } else {
        return true;
      }
    })
  );
};
