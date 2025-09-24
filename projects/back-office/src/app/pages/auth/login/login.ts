// login.ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signaux
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  // Form
  loginForm = this.fb.group({
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Getters pour les erreurs
  get emailError() {
    const control = this.loginForm.get('identifier');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Email requis';
      if (control.errors['email']) return 'Format email invalide';
    }
    return null;
  }

  get passwordError() {
    const control = this.loginForm.get('password');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Mot de passe requis';
      if (control.errors['minlength']) return 'Minimum 6 caractères';
    }
    return null;
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const loginData: LoginRequest = {
      identifier: this.loginForm.value.identifier!,
      password: this.loginForm.value.password!
    };

    try {
      await this.authService.login(loginData).toPromise();
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Erreur de connexion');
    } finally {
      this.loading.set(false);
    }
  }
}
