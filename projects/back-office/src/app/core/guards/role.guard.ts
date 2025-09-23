import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SonCollabRoleType } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    map(authState => {
      if (!authState.isAuthenticated) {
        router.navigate(['/auth/login']);
        return false;
      }

      const requiredRoles = route.data?.['roles'] as SonCollabRoleType[];
      if (!requiredRoles?.length) {
        return true;
      }

      const hasRequiredRole = authService.hasAnyRole(requiredRoles);

      if (!hasRequiredRole) {
        redirectByRole(authService.currentRole, router);
        return false;
      }

      return true;
    })
  );
};

function redirectByRole(currentRole: SonCollabRoleType | null, router: Router): void {
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
      router.navigate(['/auth/login']);
  }
}
