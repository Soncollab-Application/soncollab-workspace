import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminSalesService } from '../../../services/admin/admin-sales.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {Badge, BadgeType, Choice, ChoiceOption, ToastService} from 'shared-lib';
import { ContactModalService } from '../../../services/admin/contact-modal.service';
import { Subject, takeUntil } from 'rxjs';
import {BackofficeUser, SalesRepresentative} from '../../../models/auth.model';
import {environment} from '../../../../../environments/environment';
import {Router} from '@angular/router';

@Component({
  selector: 'app-assign-contact-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, Choice, Badge],
  templateUrl: './assign-contact-modal.html',
  styleUrl: './assign-contact-modal.css'
})
export class AssignContactModal implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private adminSalesService = inject(AdminSalesService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private modalService = inject(ContactModalService);
  private router = inject(Router);


  private destroy$ = new Subject<void>();

  assignForm!: FormGroup;
  submitting = signal(false);
  loadingReps = signal(false);

  isOpen = computed(() => {
    const state = this.modalService.state$();
    return state.isOpen && (state.type === 'assign' || state.type === 'reassign');
  });

  isReassign = computed(() => this.modalService.state$().type === 'reassign');
  contact = computed(() => this.modalService.state$().contact);

  repOptions = signal<ChoiceOption[]>([]);
  availableReps = signal<SalesRepresentative[]>([]);
  selectedRep = signal<SalesRepresentative | null>(null);

  private isUpdatingOptions = false;

  constructor() {
    effect(() => {
      const contact = this.contact();
      const isReassign = this.isReassign();
      const reps = this.availableReps();

      if (reps.length > 0 && contact && !this.isUpdatingOptions) {
        this.updateRepOptions();
      }
    });

    effect(() => {
      const options = this.repOptions();
      if (options.length === 0) {
        this.assignForm.get('user_id')?.disable();
      } else {
        this.assignForm.get('user_id')?.enable();
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadAvailableReps();

    this.assignForm.get('user_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(userId => {
        if (userId) {
          const rep = this.availableReps().find(r => r.documentId === userId);
          this.selectedRep.set(rep || null);
        } else {
          this.selectedRep.set(null);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.assignForm = this.fb.group({
      user_id: ['', Validators.required]
    });
  }

  private loadAvailableReps(): void {
    this.loadingReps.set(true);
    this.adminSalesService.getAvailableReps()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableReps.set(response.data || []);
          this.loadingReps.set(false);
        },
        error: (err) => {
          console.error('Error loading reps:', err);
          this.loadingReps.set(false);
        }
      });
  }

  private updateRepOptions(): void {
    const reps = this.availableReps();
    const currentContact = this.contact();

    const filteredReps = this.isReassign() && currentContact?.assigned_to
      ? reps.filter(rep => rep.documentId !== currentContact.assigned_to!.documentId)
      : reps;

    this.repOptions.set(
      filteredReps.map(rep => {
        const fullName = `${rep.first_name} ${rep.last_name}`;
        const initials = `${rep.first_name?.[0] || ''}${rep.last_name?.[0] || ''}`.toUpperCase();
        const avatarUrl = rep.avatar?.url ? `${environment.api.baseUrl}${rep.avatar.url}` : undefined;

        return {
          value: rep.documentId,
          label: fullName,
          avatarUrl: avatarUrl,
          avatarInitials: initials,
          avatarBgColor: 'bg-secondary'
        };
      })
    );
  }


  goToUserDetail(userId: string): void {
    this.router.navigate(['/admin/team/users', userId]);
  }

  close(): void {
    this.assignForm.reset();
    this.modalService.close();
  }

  onSubmit(): void {
    if (this.assignForm.invalid || this.submitting()) return;

    const c = this.contact();
    if (!c) return;

    const userId = this.assignForm.value.user_id;

    if (!userId) {
      this.toastService.showError(
        this.translate.instant('contact-modal.assign.rep_required')
      );
      return;
    }

    if (this.isReassign() && c.assigned_to?.documentId === userId) {
      this.toastService.showError(
        this.translate.instant('contact-modal.reassign.already_assigned')
      );
      return;
    }

    this.submitting.set(true);

    const isReassign = this.isReassign();

    const action$ = isReassign
      ? this.adminSalesService.reassignContact(c.documentId, userId)
      : this.adminSalesService.assignContact(c.documentId, userId);

    action$.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const successKey = isReassign
            ? 'contact-modal.reassign.success'
            : 'contact-modal.assign.success';

          this.toastService.showSuccess(
            this.translate.instant(successKey, {
              name: `${c.first_name} ${c.last_name}`
            })
          );

          const onSuccess = this.modalService.state$().onSuccess;
          if (onSuccess) onSuccess();

          this.close();
          this.submitting.set(false);
        },
        error: (err) => {
          console.error('Error in assign/reassign:', err);

          const errorMessage = err.error?.error?.message ||
            this.translate.instant(
              this.isReassign()
                ? 'contact-modal.reassign.error'
                : 'contact-modal.assign.error',
              { name: `${c.first_name} ${c.last_name}` }
            );

          this.toastService.showError(errorMessage);
          this.submitting.set(false);
        }
      });
  }

  getAvailabilityBadgeType(status: string): BadgeType {
    switch (status) {
      case 'available':
        return 'success';
      case 'busy':
        return 'warning';
      case 'out_of_office':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  getAvailabilityIcon(status: string): string {
    switch (status) {
      case 'available':
        return 'check_circle';
      case 'busy':
        return 'schedule';
      case 'out_of_office':
        return 'block';
      default:
        return 'help';
    }
  }


  protected readonly environment = environment;
}
