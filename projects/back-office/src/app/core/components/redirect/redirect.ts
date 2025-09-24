import {Component, inject, OnDestroy} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-redirect',
  imports: [],
  templateUrl: './redirect.html',
  styleUrl: './redirect.css'
})
export class Redirect implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private subscription?: Subscription;
  debugInfo = '';

  constructor() {
    this.handleRedirect();
  }

  private handleRedirect(): void {
    this.subscription = this.authService.authState$.subscribe(authState => {

      // Si on est encore en train de charger, on attend
      if (authState.loading) {
        return;
      }

      // Si pas authentifié, redirection vers login
      if (!authState.isAuthenticated) {
        this.router.navigate(['/auth/login']);
        return;
      }

      // Si authentifié, redirection selon le rôle
      const role = authState.user?.role?.type;

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
          this.router.navigate(['/auth/login']);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
