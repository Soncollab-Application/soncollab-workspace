// Fichier : projects/client/src/app/pages/components/v1/partials/modals/contact-modal/contact-modal.ts

import {
  Component,
  computed,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
  ViewChildren,
  QueryList,
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
import { LanguageService } from '../../../../../../core/services/language.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ChoicesSelectComponent, SelectOption } from '../../../../../../core/modules/choices/choices-select.component';
import { ChoicesConfig } from '../../../../../../core/modules/choices/choices.directive';
import { ToastService } from '../../../../../../core/modules/toast/toast.service';

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
  // ViewChildren pour accéder aux composants choices-select
  @ViewChildren(ChoicesSelectComponent) choicesSelects!: QueryList<ChoicesSelectComponent>;

  activeModal = inject(NgbActiveModal);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private contactModalService = inject(ContactModalService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

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

  // Configuration pour les différents selects - Maintenant en propriétés stables
  companySizeConfig: ChoicesConfig = {};
  contactTypeConfig: ChoicesConfig = {};
  countryConfig: ChoicesConfig = {};

  // Computed signals
  isEmailValid = computed(() => {
    const emailControl = this.contactForm?.get('email');
    return emailControl?.valid && emailControl?.dirty && !this.emailCheckResult()?.exists;
  });

  constructor() {
    this.contactForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeConfigurations();
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

  /**
   * Initialise les configurations de base des dropdowns
   */
  private initializeConfigurations(): void {
    this.companySizeConfig = {
      searchEnabled: true,
      allowHTML: true,
      searchPlaceholderValue: this.getTranslation('contact.form.search.placeholder', 'Rechercher...'),
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      classNames: { containerInner: "form-select" },
      placeholderValue: this.getTranslation('contact.form.companySize.placeholder', 'Sélectionnez')
    };

    this.contactTypeConfig = {
      searchEnabled: false,
      allowHTML: true,
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      classNames: { containerInner: "form-select" },
      placeholderValue: this.getTranslation('contact.form.contactType.placeholder', 'Sélectionnez un type')
    };

    this.countryConfig = {
      searchEnabled: true,
      allowHTML: true,
      searchPlaceholderValue: this.getTranslation('contact.form.search.country', 'Rechercher un pays...'),
      removeItemButton: false,
      editItems: false,
      shouldSort: false,
      itemSelectText: "",
      noResultsText: this.getTranslation('contact.form.search.noResults', 'Aucun résultat trouvé'),
      noChoicesText: this.getTranslation('contact.form.search.noChoices', 'Aucun choix disponible'),
      classNames: { containerInner: "form-select" },
      placeholderValue: this.getTranslation('contact.form.country.placeholder', 'Sélectionnez votre pays')
    };
  }

  /**
   * Met à jour les configurations avec les nouvelles traductions
   */
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

    // Déclencher la détection des changements
    this.cdr.detectChanges();
  }

  /**
   * Force la mise à jour de tous les composants choices-select
   */
  private forceUpdateChoicesSelects(): void {
    // Attendre que les changements soient appliqués
    setTimeout(() => {
      this.choicesSelects?.forEach(select => {
        if (select && typeof select.forceUpdate === 'function') {
          select.forceUpdate();
        }
      });
    }, 100);
  }

  /**
   * Utilitaire pour récupérer une traduction avec fallback
   */
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

  private setupLanguageDetection(): void {
    const currentLang = this.languageService.getCurrentLanguage();
    this.contactForm.patchValue({ language: currentLang });

    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.contactForm.patchValue({ language: lang });

        // Mettre à jour les configurations avec les nouvelles traductions
        this.updateConfigurations();

        // Recharger les options du formulaire
        this.loadFormOptions();
      });
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

          // Attendre un peu pour que les options soient prêtes
          setTimeout(() => {
            this.optionsLoaded.set(true);
            // Forcer la mise à jour des composants choices-select
            this.forceUpdateChoicesSelects();
          }, 150);
        },
        error: (error) => {
          console.error('Error loading form options:', error);
          this.optionsLoaded.set(true); // Pour éviter le blocage
        }
      });
  }

  private updateSelectOptions(options: ContactFormOptions): void {
    // Mise à jour des options de taille d'entreprise
    this.companySizeOptions = [
      {
        value: '',
        label: this.getTranslation('contact.form.companySize.placeholder', 'Sélectionnez')
      },
      ...options.company_sizes.map(option => ({
        value: option.value,
        label: option.label
      }))
    ];

    // Mise à jour des options de type de contact
    this.contactTypeOptions = [
      {
        value: '',
        label: this.getTranslation('contact.form.contactType.placeholder', 'Sélectionnez un type')
      },
      ...options.contact_types.map(option => ({
        value: option.value,
        label: option.label
      }))
    ];

    // Mise à jour des options de pays
    this.countryOptions = [
      {
        value: '',
        label: this.getTranslation('contact.form.country.placeholder', 'Sélectionnez votre pays')
      },
      ...options.countries.map(option => ({
        value: option.value,
        label: option.label
      }))
    ];

    // Déclencher la détection des changements
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

          // Toast d'erreur pour la vérification email - Position en haut centre pour modal
          this.toastService.showWarning(
            this.getTranslation('contact.form.error.emailCheck', 'Impossible de vérifier l\'email'),
            {
              header: this.getTranslation('contact.form.error.title', 'Erreur'),
              position: 'top-center',
              delay: 5000
            }
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

      // Toast d'erreur pour formulaire invalide - Position en haut centre pour modal
      this.toastService.showWarning(
        this.getTranslation('contact.form.error.validation', 'Veuillez corriger les erreurs dans le formulaire'),
        {
          header: this.getTranslation('contact.form.error.title', 'Erreur de validation'),
          position: 'top-center',
          delay: 4000
        }
      );

      return;
    }

    this.generateSubject();
    this.choiceSpecialValue();
    this.isSubmitting.set(true);

    const formData: ContactFormData = this.contactForm.value;

    this.contactModalService.submitContactForm(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);

          // Toast de succès - Position en haut centre pour être visible pendant la fermeture de modal
          this.toastService.showSuccess(
            this.getTranslation('contact.form.success.submitted', 'Votre message a été envoyé avec succès !'),
            {
              header: this.getTranslation('contact.form.success.title', 'Succès'),
              position: 'top-center',
              delay: 4000
            }
          );

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

          // Toast d'erreur pour l'envoi - Position en haut centre pour modal
          this.toastService.showError(
            this.getTranslation('contact.form.error.submission', 'Une erreur est survenue lors de l\'envoi'),
            {
              header: this.getTranslation('contact.form.error.title', 'Erreur'),
              position: 'top-center',
              autohide: true,
              delay: 8000
            }
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
    const contactTypeValue = this.contactForm.get('contact_type')?.value;
    const companyName = this.contactForm.get('company_name')?.value;

    // Extraire la vraie valeur si c'est un objet Choices.js
    let contactType: string;
    if (contactTypeValue && typeof contactTypeValue === 'object' && contactTypeValue.value) {
      contactType = contactTypeValue.value;
    } else if (typeof contactTypeValue === 'string') {
      contactType = contactTypeValue;
    } else {
      contactType = '';
    }

    if (contactType && companyName) {
      const subject = `${contactType} - ${companyName}`;
      this.generatedSubject.set(subject);
      this.contactForm.patchValue({ contact_subject: subject });
    }
  }

  private choiceSpecialValue(): void {
    let contactTypeValue = this.contactForm.get('contact_type')?.value;
    let company_sizeValue = this.contactForm.get('company_size')?.value;
    let countryValue = this.contactForm.get('country')?.value;

    // Normaliser les valeurs des selects Choices.js
    if (contactTypeValue && typeof contactTypeValue === 'object' && contactTypeValue.value) {
      this.contactForm.patchValue({ contact_type: contactTypeValue.value });
    }
    if (company_sizeValue && typeof company_sizeValue === 'object' && company_sizeValue.value) {
      this.contactForm.patchValue({ company_size: company_sizeValue.value });
    }
    if (countryValue && typeof countryValue === 'object' && countryValue.value) {
      this.contactForm.patchValue({ country: countryValue.value });
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
      source: 'website_modal'
    });
    this.emailCheckResult.set(null);
    this.generatedSubject.set('');
  }
}
