import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Signaux
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  rememberMe = signal(false);

  // Form avec validation personnalisée
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Getters pour les erreurs avec traductions
  get emailError() {
    const control = this.loginForm.get('email');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.login.email.required');
      }
      if (control.errors?.['email']) {
        return this.translate.instant('auth.login.email.invalid');
      }
    }
    return null;
  }

  get passwordError() {
    const control = this.loginForm.get('password');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.login.password.required');
      }
      if (control.errors?.['minlength']) {
        return this.translate.instant('auth.login.password.minLength');
      }
    }
    return null;
  }

  // Validation des champs individuels
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  toggleRememberMe() {
    this.rememberMe.set(!this.rememberMe());
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const loginData: LoginRequest = {
      identifier: this.loginForm.value.email!,
      password: this.loginForm.value.password!
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        // Gestion spécifique des erreurs backend
        let errorMessage = this.translate.instant('auth.login.errors.loginFailed');

        if (err?.error?.error) {
          const backendError = err.error.error;

          // Mapper les erreurs spécifiques du backend
          switch (backendError.name) {
            case 'ValidationError':
              if (backendError.message === 'Invalid identifier or password') {
                errorMessage = this.translate.instant('auth.login.errors.invalidCredentials');
              } else {
                errorMessage = this.translate.instant('auth.login.errors.validation');
              }
              break;
            default:
              errorMessage = backendError.message || this.translate.instant('auth.login.errors.loginFailed');
          }
        } else if (err?.status) {
          // Gestion par code de statut HTTP
          switch (err.status) {
            case 400:
              errorMessage = this.translate.instant('auth.login.errors.badRequest');
              break;
            case 401:
              errorMessage = this.translate.instant('auth.login.errors.unauthorized');
              break;
            case 500:
              errorMessage = this.translate.instant('auth.login.errors.serverError');
              break;
          }
        }

        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }
}
