import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, Choice, ChoiceOption, ChoiceConfig } from 'shared-lib';
import { FeatureFlagOffcanvasService } from '../../../../services/admin/offcanvas/feature-flag-offcanvas.service';
import { BillingService } from '../../../../services/admin/billing.service';
import { FeatureFlagStatus } from '../../../../models/admin/billing';

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

    this.statusOptions.set([
      { value: 'stable', label: this.translate.instant('feature-flag-offcanvas.status.stable') },
      { value: 'beta', label: this.translate.instant('feature-flag-offcanvas.status.beta') },
      { value: 'deprecated', label: this.translate.instant('feature-flag-offcanvas.status.deprecated') }
    ]);

    effect(() => {
      const featureFlag = this.offcanvasService.featureFlag();
      const isOpen = this.offcanvasService.isOpen();
      const mode = this.offcanvasService.mode();
      const sourceDocId = this.offcanvasService.sourceDocumentId();

      if (!isOpen) {
        this.resetForm();
        return;
      }

      if (mode === 'edit' && featureFlag) {
        this.form.patchValue({
          name: featureFlag.name,
          description: featureFlag.description || '',
          is_enabled_by_default: featureFlag.is_enabled_by_default
        });
        this.selectedStatus.set(featureFlag.feature_flag_status);
      } else if (mode === 'create' && sourceDocId) {
        this.loadSourceFeatureFlag(sourceDocId);
      } else if (mode === 'create' && !sourceDocId) {
        this.resetForm();
      }
    });
  }

  private loadSourceFeatureFlag(sourceDocId: string): void {
    this.billingService.getFeatureFlags(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const allFlags = response.data;
          let sourceFlag = allFlags.find(f => f.documentId === sourceDocId);

          if (!sourceFlag) {
            for (const flag of allFlags) {
              if (flag.localizations) {
                const localization = flag.localizations.find(l => l.documentId === sourceDocId);
                if (localization) {
                  sourceFlag = flag;
                  break;
                }
              }
            }
          }

          if (sourceFlag) {
            this.form.patchValue({
              name: '',
              description: sourceFlag.description || '',
              is_enabled_by_default: sourceFlag.is_enabled_by_default
            });
            this.selectedStatus.set(sourceFlag.feature_flag_status);
          }
        },
        error: (err) => {
          console.error('Error loading source feature flag:', err);
          this.toastService.showError(
            this.translate.instant('feature-flag-offcanvas.error.save')
          );
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
      feature_flag_status: this.selectedStatus()
    };

    if (this.offcanvasService.mode() === 'create' && this.offcanvasService.sourceDocumentId()) {
      formData.documentId = this.offcanvasService.sourceDocumentId();
    }

    const locale = this.offcanvasService.locale();

    const request$ =
      this.offcanvasService.mode() === 'create'
        ? this.billingService.createFeatureFlag({ ...formData, locale })
        : this.billingService.updateFeatureFlag(
          this.offcanvasService.featureFlag()!.documentId,
          formData,
          locale
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
