import { Component, inject, signal, effect, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, Choice, ChoiceOption, ChoiceConfig } from 'shared-lib';
import { FeatureFlagOffcanvasService } from '../../../services/admin/feature-flag-offcanvas.service';
import { BillingService } from '../../../services/admin/billing.service';
import { FeatureFlagStatus } from '../../../models/admin/billing';

@Component({
  selector: 'app-feature-flag-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, Choice],
  templateUrl: './feature-flag-offcanvas.html',
  styleUrl: './feature-flag-offcanvas.css',
})
export class FeatureFlagOffcanvas implements OnDestroy {
  private fb = inject(FormBuilder);
  protected offcanvasService = inject(FeatureFlagOffcanvasService);
  private billingService = inject(BillingService);
  private toastService = inject(ToastService);
  protected translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  form: FormGroup;
  isSubmitting = signal(false);

  statusOptions = signal<ChoiceOption[]>([]);
  selectedStatus = signal<FeatureFlagStatus>('stable');

  choiceConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false,
  };

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      is_enabled_by_default: [false]
    });

    // Initialiser les options de status
    this.statusOptions.set([
      { value: 'stable', label: this.translate.instant('feature-flag-offcanvas.status.stable') },
      { value: 'beta', label: this.translate.instant('feature-flag-offcanvas.status.beta') },
      { value: 'deprecated', label: this.translate.instant('feature-flag-offcanvas.status.deprecated') }
    ]);

    // EFFECT 1: EDIT MODE
    effect(() => {
      const featureFlag = this.offcanvasService.featureFlag();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();


      if (isOpen && mode === 'edit' && featureFlag) {
        this.form.patchValue({
          name: featureFlag.name,
          description: featureFlag.description || '',
          is_enabled_by_default: featureFlag.is_enabled_by_default
        });

        this.selectedStatus.set(featureFlag.feature_flag_status);
      } else if (isOpen && mode === 'create' && !this.offcanvasService.sourceDocumentId()) {
        // Mode create normal
        this.resetForm();
      } else if (!isOpen) {
        // Fermeture
        this.resetForm();
      }
    });

    // EFFECT 2: CREATE TRANSLATION MODE
    effect(() => {
      const sourceDocId = this.offcanvasService.sourceDocumentId();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();

      if (isOpen && mode === 'create' && sourceDocId) {
        this.billingService.getFeatureFlag(sourceDocId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const sourceFlag = response.data;
              this.form.patchValue({
                name: '', // Vide pour traduction
                description: sourceFlag.description || '',
                is_enabled_by_default: sourceFlag.is_enabled_by_default
              });

              this.selectedStatus.set(sourceFlag.feature_flag_status);
            },
            error: (err) => {
              console.error('Error loading source feature flag:', err);
            }
          });
      }
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      description: '',
      is_enabled_by_default: false
    });

    this.selectedStatus.set('stable');

    this.form.markAsUntouched();
    this.form.markAsPristine();
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value as FeatureFlagStatus);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const formData = {
      ...this.form.value,
      feature_flag_status: this.selectedStatus(),
      locale: this.offcanvasService.locale()
    };

    const request$ =
      this.offcanvasService.mode() === 'create'
        ? this.billingService.createFeatureFlag(formData)
        : this.billingService.updateFeatureFlag(
          this.offcanvasService.featureFlag()!.documentId,
          formData
        );

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'feature-flag-offcanvas.success.created'
              : 'feature-flag-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.close();
      },
      error: (err) => {
        console.error('Error saving feature flag:', err);
        this.toastService.showError(
          this.translate.instant('feature-flag-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
