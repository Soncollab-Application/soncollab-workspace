import {Component, computed, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {TranslateModule, TranslateService} from '@ngx-translate/core';

export interface FormModalConfig {
  title: string;
  submitText?: string;
  cancelText?: string;
  size?: 'sm' | 'lg' | 'xl';
}

@Component({
  selector: 'lib-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './form-modal.component.html',
  styleUrls: ['./form-modal.component.css']
})
export class FormModalComponent {
  activeModal = inject(NgbActiveModal);
  private translate = inject(TranslateService);

  // Inputs
  config = input.required<FormModalConfig>();
  form = input.required<FormGroup>();

  // Outputs
  submitForm = output<void>();

  // State
  isSubmitting = signal<boolean>(false);

  // Computed
  canSubmit = computed(() => this.form().valid && !this.isSubmitting());

  getSubmitText(): string {
    return this.config().submitText || this.translate.instant('formModalShared.submit');
  }

  getCancelText(): string {
    return this.config().cancelText || this.translate.instant('formModalShared.cancel');
  }

  onSubmit(): void {
    if (this.form().valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.submitForm.emit();
    }
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  setSubmitting(value: boolean): void {
    this.isSubmitting.set(value);
  }
}
