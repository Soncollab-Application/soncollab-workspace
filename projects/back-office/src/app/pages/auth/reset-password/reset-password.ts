import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

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

  // Form
  resetPasswordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirmation: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

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

  // Validator personnalisé pour vérifier que les mots de passe correspondent
  private passwordMatchValidator(form: any) {
    const password = form.get('password');
    const passwordConfirmation = form.get('passwordConfirmation');

    if (password && passwordConfirmation && password.value !== passwordConfirmation.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  // Getters pour les erreurs avec traductions
  get passwordError() {
    const control = this.resetPasswordForm.get('password');
    if (control?.touched && control?.invalid) {
      if (control.errors?.['required']) {
        return this.translate.instant('auth.resetPassword.password.required');
      }
      if (control.errors?.['minlength']) {
        return this.translate.instant('auth.resetPassword.password.minLength');
      }
    }
    return null;
  }

  get passwordConfirmError() {
    const control = this.resetPasswordForm.get('passwordConfirmation');
    const formErrors = this.resetPasswordForm.errors;

    if (control?.touched) {
      if (control.invalid && control.errors?.['required']) {
        return this.translate.instant('auth.resetPassword.passwordConfirm.required');
      }
      if (formErrors?.['passwordMismatch']) {
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

        // Redirection automatique après succès
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (err: any) => {
        // Gestion spécifique des erreurs backend
        let errorMessage = this.translate.instant('auth.resetPassword.errors.resetFailed');

        if (err?.error?.error) {
          const backendError = err.error.error;

          switch (backendError.name) {
            case 'ValidationError':
              if (backendError.message.includes('password')) {
                errorMessage = this.translate.instant('auth.resetPassword.errors.invalidPassword');
              } else {
                errorMessage = this.translate.instant('auth.resetPassword.errors.validation');
              }
              break;
            case 'ApplicationError':
              if (backendError.message.includes('code')) {
                errorMessage = this.translate.instant('auth.resetPassword.errors.invalidCode');
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
            case 404:
              errorMessage = this.translate.instant('auth.resetPassword.errors.invalidCode');
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

  goToForgotPassword() {
    this.router.navigate(['/auth/forgot-password']);
  }
}
