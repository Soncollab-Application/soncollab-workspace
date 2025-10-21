import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators } from 'shared-lib';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Signaux
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Form
  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, CustomValidators.email()]],
  });

  // Getter pour les erreurs avec traductions
  get emailError() {
    const control = this.forgotPasswordForm.get('email');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.forgotPassword.email.required');
      }
      if (control.errors?.['email']) {
        return this.translate.instant('auth.forgotPassword.email.invalid');
      }
    }
    return null;
  }

  // Validation des champs individuels
  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const email = this.forgotPasswordForm.value.email!;

    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err: any) => {
        // Gestion spécifique des erreurs backend
        let errorMessage = this.translate.instant('auth.forgotPassword.errors.requestFailed');

        if (err?.error?.error) {
          const backendError = err.error.error;

          switch (backendError.name) {
            case 'ValidationError':
              errorMessage = this.translate.instant('auth.forgotPassword.errors.invalidEmail');
              break;
            case 'ApplicationError':
              if (backendError.message.includes('not found')) {
                errorMessage = this.translate.instant('auth.forgotPassword.errors.emailNotFound');
              }
              break;
            default:
              errorMessage = backendError.message || this.translate.instant('auth.forgotPassword.errors.requestFailed');
          }
        } else if (err?.status) {
          switch (err.status) {
            case 400:
              errorMessage = this.translate.instant('auth.forgotPassword.errors.badRequest');
              break;
            case 404:
              errorMessage = this.translate.instant('auth.forgotPassword.errors.emailNotFound');
              break;
            case 500:
              errorMessage = this.translate.instant('auth.forgotPassword.errors.serverError');
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
