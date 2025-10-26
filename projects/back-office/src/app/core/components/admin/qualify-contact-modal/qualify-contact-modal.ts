import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminSalesService } from '../../../services/admin/admin-sales.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Choice, ChoiceOption, ToastService } from 'shared-lib';
import { ContactModalService } from '../../../services/admin/contact-modal.service';
import { Subject, takeUntil } from 'rxjs';
import { CompanySize, SalesContactStatus, UrgencyLevel } from '../../../models/sales/sales-contact.model';

@Component({
  selector: 'app-qualify-contact-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, Choice],
  templateUrl: './qualify-contact-modal.html',
  styleUrl: './qualify-contact-modal.css'
})
export class QualifyContactModal implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private adminSalesService = inject(AdminSalesService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private modalService = inject(ContactModalService);

  private destroy$ = new Subject<void>();

  qualifyForm!: FormGroup;
  submitting = signal(false);

  isOpen = computed(() => {
    const state = this.modalService.state$();
    return state.isOpen && state.type === 'qualify';
  });

  contact = computed(() => this.modalService.state$().contact);

  statusOptions = signal<ChoiceOption[]>([]);
  companySizeOptions = signal<ChoiceOption[]>([]);
  urgencyOptions = signal<ChoiceOption[]>([]);

  ngOnInit(): void {
    this.initForm();
    this.initOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const c = this.contact();

    this.qualifyForm = this.fb.group({
      sales_contact_status: [c?.sales_contact_status || 'qualified', Validators.required],
      company_size: [c?.company_size || ''],
      estimated_annual_revenue: [c?.estimated_annual_revenue || null],
      urgency_level: [c?.urgency_level || 'normal', Validators.required],
      prospection_notes: [c?.prospection_notes || '', Validators.maxLength(1000)]
    });
  }

  private initOptions(): void {
    // Status options - uniquement les statuts pertinents pour la qualification
    const statuses: SalesContactStatus[] = [
      'qualified',
      'interested',
      'demo_scheduled',
      'proposal_sent'
    ];

    this.statusOptions.set(
      statuses.map(status => ({
        value: status,
        label: this.translate.instant(`contacts-list.statuses.${status}`)
      }))
    );

    // Company size options
    const sizes: CompanySize[] = [
      'micro_1_10',
      'small_11_50',
      'medium_51_200',
      'large_201_500',
      'enterprise_500_plus'
    ];

    this.companySizeOptions.set(
      sizes.map(size => ({
        value: size,
        label: this.translate.instant(`contact-modal.qualify.company_sizes.${size}`)
      }))
    );

    // Urgency options
    const urgencies: UrgencyLevel[] = ['low', 'normal', 'high', 'urgent'];

    this.urgencyOptions.set(
      urgencies.map(urgency => ({
        value: urgency,
        label: this.translate.instant(`contacts-list.urgencies.${urgency}`)
      }))
    );
  }

  close(): void {
    this.qualifyForm.reset();
    this.modalService.close();
  }

  onSubmit(): void {
    if (this.qualifyForm.invalid || this.submitting()) return;

    const c = this.contact();
    if (!c) return;

    this.submitting.set(true);

    const qualificationData = {
      sales_contact_status: this.qualifyForm.value.sales_contact_status,
      urgency_level: this.qualifyForm.value.urgency_level,
      ...(this.qualifyForm.value.company_size && {
        company_size: this.qualifyForm.value.company_size
      }),
      ...(this.qualifyForm.value.estimated_annual_revenue && {
        estimated_annual_revenue: this.qualifyForm.value.estimated_annual_revenue
      }),
      ...(this.qualifyForm.value.prospection_notes && {
        prospection_notes: this.qualifyForm.value.prospection_notes
      })
    };

    this.adminSalesService.qualifyContact(c.documentId, qualificationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('contact-modal.qualify.success', {
              name: `${c.first_name} ${c.last_name}`
            })
          );

          const onSuccess = this.modalService.state$().onSuccess;
          if (onSuccess) onSuccess();

          this.close();
          this.submitting.set(false);
        },
        error: () => {
          this.toastService.showError(
            this.translate.instant('contact-modal.qualify.error', {
              name: `${c.first_name} ${c.last_name}`
            })
          );
          this.submitting.set(false);
        }
      });
  }
}
