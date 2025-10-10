import { Component, inject, Input, OnDestroy, OnInit, signal, computed, effect } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import {
  NewsletterModalService,
  NewsletterResponse,
  NewsletterSubscriptionData
} from '../../../../../../core/services/newsletter-modal.service';
import { ToastService, LanguageService } from 'shared-lib';
import { RecaptchaActionService } from '../../../../../services/recaptcha-action.service';

@Component({
  selector: 'app-newsletter-modal',
  imports: [TranslatePipe, ReactiveFormsModule],
  templateUrl: './newsletter-modal.html',
  styleUrl: './newsletter-modal.css'
})
export class NewsletterModal implements OnInit, OnDestroy {
  activeModal = inject(NgbActiveModal);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private newsletterService = inject(NewsletterModalService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);
  recaptchaActionService = inject(RecaptchaActionService);

  @Input() subscriptionType: 'blog' | 'help' | 'general' = 'general';
  @Input() source?: string;

  private destroy$ = new Subject<void>();


  isSubmitting = signal(false);
  currentLang = computed(() => this.languageService.currentLanguage());

  newsletterForm!: FormGroup;

  ngOnInit(): void {
    this.setupForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupForm(): void {
    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.maxLength(100)]],
      subscription_type: [this.subscriptionType, [Validators.required]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.newsletterForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const token = await this.recaptchaActionService.getNewsletterToken();

        const formValue = this.newsletterForm.value;
        const subscriptionData: NewsletterSubscriptionData = {
          email: formValue.email,
          first_name: formValue.first_name || undefined,
          subscription_type: formValue.subscription_type,
          source: this.source || this.getSourceFromType(),
          recaptcha_token: token
        };

        this.newsletterService.subscribeToNewsletter(subscriptionData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: NewsletterResponse) => {
              this.isSubmitting.set(false);
              this.handleSuccess(response);
            },
            error: (error) => {
              this.isSubmitting.set(false);
              this.handleError(error);
            }
          });
      } catch (error) {
        this.isSubmitting.set(false);
        this.handleError(error);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private handleSuccess(response: NewsletterResponse): void {
    const successKey = this.getSuccessMessageKey();
    this.translateService.get(successKey).subscribe((message: string) => {
      this.toastService.showSuccess(message);
      this.activeModal.close(response);
    });
  }

  private handleError(error: any): void {
    let errorMessageKey = 'newsletter.errors.generic';

    if (error.status === 400) {
      errorMessageKey = 'newsletter.errors.invalidData';
    } else if (error.status === 409) {
      errorMessageKey = 'newsletter.errors.alreadySubscribed';
    } else if (error.status === 500) {
      errorMessageKey = 'newsletter.errors.serverError';
    }

    this.translateService.get(errorMessageKey).subscribe((message: string) => {
      this.toastService.showError(message, {
        title: this.translateService.instant('newsletter.errors.title'),
        position: 'top-center',
        delay: 6000
      });
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.newsletterForm.controls).forEach(key => {
      this.newsletterForm.get(key)?.markAsTouched();
    });
  }

  private getSourceFromType(): string {
    const sourceMap = {
      'blog': 'blog_page',
      'help': 'help_page',
      'general': 'modal',
      'product_updates': 'product_page'
    };
    return sourceMap[this.subscriptionType] || 'modal';
  }

  private getSuccessMessageKey(): string {
    const messageMap = {
      'blog': 'newsletter.success.blog',
      'help': 'newsletter.success.help',
      'general': 'newsletter.success.general',
      'product_updates': 'newsletter.success.product'
    };
    return messageMap[this.subscriptionType] || 'newsletter.success.general';
  }

  getTitleKey(): string {
    const titleMap = {
      'blog': 'newsletter.titles.blog',
      'help': 'newsletter.titles.help',
      'general': 'newsletter.titles.general',
      'product_updates': 'newsletter.titles.product'
    };
    return titleMap[this.subscriptionType] || 'newsletter.titles.general';
  }

  getDescriptionKey(): string {
    const descriptionMap = {
      'blog': 'newsletter.descriptions.blog',
      'help': 'newsletter.descriptions.help',
      'general': 'newsletter.descriptions.general',
      'product_updates': 'newsletter.descriptions.product'
    };
    return descriptionMap[this.subscriptionType] || 'newsletter.descriptions.general';
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.newsletterForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.newsletterForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return this.translateService.instant('newsletter.validation.required');
      }
      if (field.errors['email']) {
        return this.translateService.instant('newsletter.validation.invalidEmail');
      }
      if (field.errors['maxlength']) {
        return this.translateService.instant('newsletter.validation.maxLength');
      }
    }
    return '';
  }

  close(): void {
    this.activeModal.dismiss('closed');
  }
}
