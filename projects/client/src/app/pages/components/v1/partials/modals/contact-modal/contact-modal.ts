import {
  Component,
  computed,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal
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
import { LanguageService } from '../../../../../../core/services/language.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ChoicesSelectComponent, SelectOption } from '../../../../../../core/modules/choices/choices-select.component';
import { ChoicesConfig } from '../../../../../../core/modules/choices/choices.directive';
import {ToastService} from '../../../../../../core/modules/toast/toast.service';

@Component({
  selector: 'app-contact-modal',
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    CommonModule,
    ChoicesSelectComponent,
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

  @Input() initialData?: any;

  private destroy$ = new Subject<void>();

  // Signals pour l'état réactif
  formOptions = signal<ContactFormOptions | null>(null);
  isSubmitting = signal(false);
  isCheckingEmail = signal(false);
  emailCheckResult = signal<EmailCheckResponse | null>(null);
  generatedSubject = signal('');
  optionsLoaded = signal(false);

  // Form réactif
  contactForm: FormGroup;

  // Options pour les selects - Maintenant en propriétés normales
  companySizeOptions: SelectOption[] = [];
  contactTypeOptions: SelectOption[] = [];
  countryOptions: SelectOption[] = [];

  // Configuration pour les différents selects
  get companySizeConfig(): ChoicesConfig {
    return {
      searchEnabled: true,
      searchPlaceholderValue: this.translateService.instant('contact.form.search.placeholder'),
      noResultsText: this.translateService.instant('contact.form.search.noResults'),
      noChoicesText: this.translateService.instant('contact.form.search.noChoices'),
      itemSelectText: "",
      classNames: {
        containerInner: "form-select"
      }
    };
  }

  get contactTypeConfig(): ChoicesConfig {
    return {
      searchEnabled: false,
      noChoicesText: this.translateService.instant('contact.form.search.noChoices'),
      itemSelectText: "",
      classNames: {
        containerInner: "form-select"
      }
    };
  }

  get countryConfig(): ChoicesConfig {
    return {
      searchEnabled: true,
      searchPlaceholderValue: this.translateService.instant('contact.form.search.country'),
      noResultsText: this.translateService.instant('contact.form.search.noResults'),
      noChoicesText: this.translateService.instant('contact.form.search.noChoices'),
      itemSelectText: "",
      classNames: {
        containerInner: "form-select"
      }
    };
  }

  // Computed signals
  isEmailValid = computed(() => {
    const emailControl = this.contactForm?.get('email');
    return emailControl?.valid && emailControl?.dirty && !this.emailCheckResult()?.exists;
  });

  constructor() {
    this.contactForm = this.createForm();
  }

  ngOnInit(): void {
    this.setupEmailValidation();
    this.setupLanguageDetection();
    this.loadFormOptions();

    if (this.initialData) {
      this.contactForm.patchValue(this.initialData);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private setupLanguageDetection(): void {
    const currentLang = this.languageService.getCurrentLanguage();
    this.contactForm.patchValue({ language: currentLang });

    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.contactForm.patchValue({ language: lang });
        this.loadFormOptions();

        // Force la mise à jour des configurations de langue
        setTimeout(() => {
          // Les getters seront appelés avec les nouvelles traductions
          this.optionsLoaded.set(false);
          setTimeout(() => this.optionsLoaded.set(true), 100);
        }, 200);
      });
  }

  private loadFormOptions(): void {
    this.optionsLoaded.set(false); // Reset pour forcer le rechargement
    const currentLang = this.languageService.getCurrentLanguage();

    this.contactModalService.getContactFormOptions(currentLang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.formOptions.set(options);
          this.updateSelectOptions(options);

          // Attendre un peu pour que les options soient prêtes
          setTimeout(() => {
            this.optionsLoaded.set(true);
          }, 100);
        },
        error: (error) => {
          this.optionsLoaded.set(true); // Pour éviter le blocage
        }
      });
  }

  private updateSelectOptions(options: ContactFormOptions): void {
    // Mise à jour des options de taille d'entreprise
    this.companySizeOptions = [
      { value: '', label: this.translateService.instant('contact.form.companySize.placeholder') },
      ...options.company_sizes.map(option => ({ value: option.value, label: option.label }))
    ];

    // Mise à jour des options de type de contact
    this.contactTypeOptions = [
      { value: '', label: this.translateService.instant('contact.form.contactType.placeholder') },
      ...options.contact_types.map(option => ({ value: option.value, label: option.label }))
    ];

    // Mise à jour des options de pays
    this.countryOptions = [
      { value: '', label: this.translateService.instant('contact.form.country.placeholder') },
      ...options.countries.map(option => ({ value: option.value, label: option.label }))
    ];
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
            this.translateService.instant('contact.form.error.emailCheck'),
            this.translateService.instant('contact.form.error.title')
          );
        }
      });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.contactForm.invalid || this.isSubmitting()) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.generateSubject();
    this.isSubmitting.set(true);

    const formData: ContactFormData = this.contactForm.value;

    this.contactModalService.submitContactForm(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.activeModal.close('success');

          setTimeout(() => {
            this.contactModalService.openSuccessModal(
              response.message,
              response.data
            );
          }, 300);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.toastService.showError(
            this.translateService.instant('contact.form.error.submission'),
            this.translateService.instant('contact.form.error.title')
          );
        }
      });
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
      this.contactForm.patchValue({ contact_subject: subject });
    }
  }

  closeModal(): void {
    this.activeModal.dismiss('cancel');
  }

  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }

  private resetForm(): void {
    this.contactForm.reset({
      language: this.languageService.getCurrentLanguage(),
      source: 'website_form'
    });
    this.emailCheckResult.set(null);
    this.generatedSubject.set('');
  }
}
