import {
  Component,
  computed,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  ContactFormData,
  ContactFormOptions,
  ContactModalService,
  EmailCheckResponse
} from '../../../../../../core/services/contact-modal.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Choice } from 'shared-lib';
import type { ChoiceOption, ChoiceConfig } from 'shared-lib';
import {
  LanguageOrchestratorService,
  LanguageService,
  ToastService
} from 'shared-lib';
import { RecaptchaActionService } from '../../../../../services/recaptcha-action.service';

@Component({
  selector: 'app-contact-modal',
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    CommonModule,
    Choice
  ],
  standalone: true,
  templateUrl: './contact-modal.html',
  styleUrl: './contact-modal.css'
})
export class ContactModal implements OnInit, OnDestroy {
  activeModal = inject(NgbActiveModal);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private contactModalService = inject(ContactModalService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);
  private recaptchaActionService = inject(RecaptchaActionService);
  private cdr = inject(ChangeDetectorRef);
  private languageOrchestrator = inject(LanguageOrchestratorService);

  @Input() initialData?: any;

  private componentId = 'contact-modal';
  private destroy$ = new Subject<void>();
  private hasInitialLoad = false;

  // Signals
  formOptions = signal<ContactFormOptions | null>(null);
  isSubmitting = signal(false);
  isCheckingEmail = signal(false);
  emailCheckResult = signal<EmailCheckResponse | null>(null);
  generatedSubject = signal('');
  optionsLoaded = signal(false);
  formSubmitAttempted = signal(false);

  // Form
  contactForm: FormGroup;

  // Options pour les selects
  companySizeOptions = signal<ChoiceOption[]>([]);
  contactTypeOptions = signal<ChoiceOption[]>([]);
  countryOptions = signal<ChoiceOption[]>([]);

  // Configuration pour les différents selects
  companySizeConfig: ChoiceConfig = {};
  contactTypeConfig: ChoiceConfig = {};
  countryConfig: ChoiceConfig = {};

  // Computed signals
  isEmailValid = computed(() => {
    const emailControl = this.contactForm?.get('email');
    return emailControl?.valid && emailControl?.dirty && !this.emailCheckResult()?.exists;
  });

  public isPricingInquiry = false;

  constructor() {
    this.contactForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeConfigurations();
    this.setupEmailValidation();

    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.loadFormOptions();

    if (this.initialData) {
      this.isPricingInquiry = this.initialData.isPricingInquiry || false;
      this.contactForm.patchValue(this.initialData, { emitEvent: false });
      if (this.isPricingInquiry) {
        this.contactForm.get('contact_type')?.disable();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
  }

  private initializeConfigurations(): void {
    this.companySizeConfig = {
      searchEnabled: true,
      allowHTML: false,
      searchPlaceholderValue: this.getTranslation('contact.form.search.placeholder', 'Rechercher...'),
      itemSelectText: "",
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.companySize.placeholder', 'Sélectionnez'),
      placeholder: true
    };

    this.contactTypeConfig = {
      searchEnabled: false,
      allowHTML: false,
      itemSelectText: "",
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.contactType.placeholder', 'Sélectionnez un type'),
      placeholder: true
    };

    this.countryConfig = {
      searchEnabled: true,
      allowHTML: false,
      searchPlaceholderValue: this.getTranslation('contact.form.search.country', 'Rechercher un pays...'),
      itemSelectText: "",
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.country.placeholder', 'Sélectionnez votre pays'),
      placeholder: true
    };
  }

  private updateConfigurations(): void {
    this.companySizeConfig = {
      ...this.companySizeConfig,
      searchPlaceholderValue: this.getTranslation('contact.form.search.placeholder', 'Rechercher...'),
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.companySize.placeholder', 'Sélectionnez')
    };

    this.contactTypeConfig = {
      ...this.contactTypeConfig,
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.contactType.placeholder', 'Sélectionnez un type')
    };

    this.countryConfig = {
      ...this.countryConfig,
      searchPlaceholderValue: this.getTranslation('contact.form.search.country', 'Rechercher un pays...'),
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      placeholderValue: this.getTranslation('contact.form.country.placeholder', 'Sélectionnez votre pays')
    };

    this.cdr.detectChanges();
  }

  private getTranslation(key: string, fallback?: string): string {
    const translation = this.translateService.instant(key);
    return translation !== key ? translation : (fallback || key);
  }

  private createForm(): FormGroup {
    return this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      contact_type: ['', [Validators.required]],
      message: [''],
      company_name: ['', [Validators.required]],
      company_size: ['', Validators.required],
      company_website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      country: ['', [Validators.required]],
      language: [''],
      source: ['website_modal'],
      contact_subject: ['']
    });
  }

  private setupEmailValidation(): void {
    const emailControl = this.contactForm.get('email');

    if (emailControl) {
      emailControl.valueChanges
        .pipe(
          debounceTime(500),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(email => {
          this.emailCheckResult.set(null);

          if (email && emailControl.valid) {
            this.checkEmail(email);
          }
        });
    }
  }

  onLanguageChange(): void {
    if (this.hasInitialLoad) {
      const currentLang = this.languageService.getCurrentLanguage();
      this.contactForm.patchValue({ language: currentLang }, { emitEvent: false });
      this.updateConfigurations();
      this.loadFormOptions();
    }
  }

  private loadFormOptions(): void {
    this.optionsLoaded.set(false);
    const currentLang = this.languageService.getCurrentLanguage();

    this.contactModalService.getContactFormOptions(currentLang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.formOptions.set(options);
          this.updateSelectOptions(options);
          this.hasInitialLoad = true;

          setTimeout(() => {
            this.optionsLoaded.set(true);

            // IMPORTANT: Marquer tous les champs comme untouched et pristine
            Object.keys(this.contactForm.controls).forEach(key => {
              const control = this.contactForm.get(key);
              control?.markAsUntouched();
              control?.markAsPristine();
            });

            // Réinitialiser le flag de soumission
            this.formSubmitAttempted.set(false);

            this.cdr.detectChanges();
          }, 300);
        },
        error: (error) => {
          console.error('Error loading form options:', error);
          this.optionsLoaded.set(true);
          this.hasInitialLoad = true;
        }
      });
  }

  private updateSelectOptions(options: ContactFormOptions): void {
    this.companySizeOptions.set([
      {
        value: '',
        label: this.getTranslation('contact.form.companySize.placeholder', 'Sélectionnez'),
        placeholder: true,
        disabled: false,
        selected: false
      },
      ...options.company_sizes.map(option => ({
        value: option.value,
        label: option.label,
        selected: false
      }))
    ]);

    this.contactTypeOptions.set([
      {
        value: '',
        label: this.getTranslation('contact.form.contactType.placeholder', 'Sélectionnez un type'),
        placeholder: true,
        disabled: false,
        selected: false
      },
      ...options.contact_types.map(option => ({
        value: option.value,
        label: option.label,
        selected: false
      }))
    ]);

    this.countryOptions.set([
      {
        value: '',
        label: this.getTranslation('contact.form.country.placeholder', 'Sélectionnez votre pays'),
        placeholder: true,
        disabled: false,
        selected: false
      },
      ...options.countries.map(option => ({
        value: option.value,
        label: option.label,
        selected: false
      }))
    ]);

    this.cdr.detectChanges();
  }

  private checkEmail(email: string): void {
    this.isCheckingEmail.set(true);

    this.contactModalService.checkEmailAvailability(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.emailCheckResult.set(result);
          this.isCheckingEmail.set(false);
        },
        error: (error) => {
          this.isCheckingEmail.set(false);
          this.emailCheckResult.set(null);

          this.toastService.showWarning(
            this.getTranslation('contact.form.error.emailCheck', 'Impossible de vérifier l\'email'),
            {
              title: this.getTranslation('contact.form.error.title', 'Erreur'),
              position: 'top-center',
              delay: 5000
            }
          );
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    if (!field) return false;

    return field.invalid && field.touched;
  }


  async onSubmit(): Promise<void> {

    if (this.contactForm.invalid || this.isSubmitting()) {
      this.markAllFieldsAsTouched();

      this.toastService.showWarning(
        this.getTranslation('contact.form.error.validation', 'Veuillez corriger les erreurs dans le formulaire'),
        {
          title: this.getTranslation('contact.form.error.title', 'Erreur de validation'),
          position: 'top-center',
          delay: 4000
        }
      );

      return;
    }

    this.generateSubject();
    this.isSubmitting.set(true);

    try {
      const recaptchaToken = await this.recaptchaActionService.getContactFormToken();

      const formData: ContactFormData = {
        ...this.contactForm.value,
        language: this.languageService.getCurrentLanguage(),
        recaptcha_token: recaptchaToken
      };

      if (this.isPricingInquiry) {
        formData.contact_type = 'pricing_inquiry';
      }

      this.contactModalService.submitContactForm(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting.set(false);

            this.activeModal.close({
              success: true,
              data: response.data,
              message: response.message,
              isPricingInquiry: this.isPricingInquiry
            });

            setTimeout(() => {
              this.contactModalService.openSuccessModal(
                response.message,
                response.data
              );
            }, 300);
          },
          error: (error) => {
            this.isSubmitting.set(false);

            let errorMessage = this.getTranslation('contact.form.error.submission', 'Une erreur est survenue lors de l\'envoi');

            if (error.status === 400 && error.error?.message?.includes('reCAPTCHA')) {
              errorMessage = this.getTranslation('contact.form.error.security', 'Vérification de sécurité échouée. Veuillez réessayer.');
            }

            this.toastService.showError(
              errorMessage,
              {
                title: this.getTranslation('contact.form.error.title', 'Erreur'),
                position: 'top-center',
                autohide: true,
                delay: 8000
              }
            );
          }
        });

    } catch (recaptchaError) {
      this.isSubmitting.set(false);

      this.toastService.showError(
        this.getTranslation('contact.form.error.security.network', 'Erreur de vérification de sécurité. Vérifiez votre connexion et réessayez.'),
        {
          title: this.getTranslation('contact.form.error.title', 'Erreur'),
          position: 'top-center',
          delay: 6000
        }
      );

      console.error('reCAPTCHA error:', recaptchaError);
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.contactForm.controls).forEach(key => {
      this.contactForm.get(key)?.markAsTouched();
    });
  }

  private generateSubject(): void {
    const contactType = this.contactForm.get('contact_type')?.value;
    const companyName = this.contactForm.get('company_name')?.value;

    if (contactType && companyName) {
      const subject = `${contactType} - ${companyName}`;
      this.generatedSubject.set(subject);
      this.contactForm.patchValue({ contact_subject: subject }, { emitEvent: false });
    }
  }

  closeModal(): void {
    this.activeModal.dismiss('cancel');
  }

  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }
}
