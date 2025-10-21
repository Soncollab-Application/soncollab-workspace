import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { CustomValidators } from 'shared-lib';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  // Signaux
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  showPassword = signal(false);
  showPasswordConfirm = signal(false);

  // Code de reset depuis l'URL
  resetCode = signal<string | null>(null);

  // Form avec CustomValidators
  resetPasswordForm = this.fb.group({
    password: ['', [Validators.required, CustomValidators.strongPassword()]],
    passwordConfirmation: ['', [Validators.required, CustomValidators.passwordMatch('password')]]
  });

  ngOnInit() {
    // Récupérer le code depuis les query params
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.resetCode.set(params['code']);
      } else {
        // Redirection vers forgot-password si pas de code
        this.router.navigate(['/auth/forgot-password']);
      }
    });
  }

  // Getters pour les erreurs avec traductions
  get passwordError() {
    const control = this.resetPasswordForm.get('password');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.resetPassword.password.required');
      }
      if (control.errors?.['weakPassword']) {
        const weakPassword = control.errors['weakPassword'];
        const errors = [];

        if (!weakPassword.hasMinLength) {
          errors.push(this.translate.instant('auth.resetPassword.password.minLength'));
        }
        if (!weakPassword.hasUpperCase) {
          errors.push(this.translate.instant('auth.resetPassword.password.uppercase'));
        }
        if (!weakPassword.hasLowerCase) {
          errors.push(this.translate.instant('auth.resetPassword.password.lowercase'));
        }
        if (!weakPassword.hasNumber) {
          errors.push(this.translate.instant('auth.resetPassword.password.number'));
        }
        if (!weakPassword.hasSpecialChar) {
          errors.push(this.translate.instant('auth.resetPassword.password.special'));
        }

        return errors.join(', ');
      }
    }
    return null;
  }

  get passwordConfirmError() {
    const control = this.resetPasswordForm.get('passwordConfirmation');

    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.resetPassword.passwordConfirm.required');
      }
      if (control.errors?.['passwordMismatch']) {
        return this.translate.instant('auth.resetPassword.passwordConfirm.mismatch');
      }
    }
    return null;
  }

  // Validation des champs individuels
  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  // Affichage/masquage des mots de passe
  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  togglePasswordConfirm() {
    this.showPasswordConfirm.set(!this.showPasswordConfirm());
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid || !this.resetCode()) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const { password, passwordConfirmation } = this.resetPasswordForm.value;

    this.authService.resetPassword(
      this.resetCode()!,
      password!,
      passwordConfirmation!
    ).subscribe({
      next: (response) => {
        this.success.set(true);
        this.loading.set(false);

        // Redirection automatique après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (err: any) => {
        let errorMessage = this.translate.instant('auth.resetPassword.errors.resetFailed');

        if (err?.error?.error) {
          const backendError = err.error.error;

          switch (backendError.name) {
            case 'ValidationError':
              errorMessage = this.translate.instant('auth.resetPassword.errors.validation');
              break;
            case 'ApplicationError':
              if (backendError.message.includes('token')) {
                errorMessage = this.translate.instant('auth.resetPassword.errors.invalidToken');
              }
              break;
            default:
              errorMessage = backendError.message || this.translate.instant('auth.resetPassword.errors.resetFailed');
          }
        } else if (err?.status) {
          switch (err.status) {
            case 400:
              errorMessage = this.translate.instant('auth.resetPassword.errors.badRequest');
              break;
            case 500:
              errorMessage = this.translate.instant('auth.resetPassword.errors.serverError');
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
