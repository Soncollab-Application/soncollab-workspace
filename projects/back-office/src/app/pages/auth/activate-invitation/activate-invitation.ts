import {Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AuthService} from '../../../core/services/auth.service';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-activate-invitation',
  imports: [
    RouterLink,
    TranslatePipe,
    ReactiveFormsModule
  ],
  templateUrl: './activate-invitation.html',
  styleUrl: './activate-invitation.css'
})
export class ActivateInvitation implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);


  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  showPassword = signal(false);
  token = signal<string | null>(null);

  activateForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    if (this.authService.isAuthenticated) {
      this.authService.logout(false);
    }

    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token.set(params['token']);
      } else {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  get passwordError() {
    const control = this.activateForm.get('password');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.activateInvitation.password.required');
      }
      if (control.errors?.['minLength']) {
        return this.translate.instant('auth.activateInvitation.password.minLength');
      }
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.activateForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (this.activateForm.invalid || !this.token()) {
      this.activateForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const password = this.activateForm.value.password!;

    this.authService.activateInvitation(this.token()!, password).subscribe({
      next: (response) => {
        this.success.set(true);
        this.loading.set(false);

        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (err: any) => {
        let errorMessage = this.translate.instant('auth.activateInvitation.errors.activationFailed');

        if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.status) {
          switch (err.status) {
            case 400:
              errorMessage = this.translate.instant('auth.activateInvitation.errors.badRequest');
              break;
            case 500:
              errorMessage = this.translate.instant('auth.activateInvitation.errors.serverError');
              break;
          }
        }

        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  goBackToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
