import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  Badge,
  BadgeType,
  Choice,
  ChoiceOption,
  ConfirmDialogService,
  LanguageOrchestratorService,
  PermissionService,
  RelativeDatePipe,
  ToastService,
} from 'shared-lib';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
import { AdminService } from '../../../../../core/services/admin/admin.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { SalesQuota, QuotaType } from '../../../../../core/models/sales/sales-quota.model';
import { Country } from '../../../../../core/models/admin/invitation.model';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-quota-detail',
  standalone: true,
  imports: [
    Breadcrumb,
    TranslatePipe,
    Badge,
    RelativeDatePipe,
    ReactiveFormsModule,
    Choice
  ],
  templateUrl: './quota-detail.html',
  styleUrl: './quota-detail.css'
})
export class QuotaDetail implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionService = inject(PermissionService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  private destroy$ = new Subject<void>();
  private componentId = 'quota-detail';

  quota = signal<SalesQuota | null>(null);
  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);

  countries = signal<Country[]>([]);
  countryOptions = signal<ChoiceOption[]>([]);

  quotaForm!: FormGroup;

  protected readonly environment = environment;

  canUpdate = computed(() =>
    this.permissionService.hasPermission('sales-quota', 'sales-quota', 'update')
  );

  canDelete = computed(() =>
    this.permissionService.hasPermission('sales-quota', 'sales-quota', 'delete')
  );

  canViewUser = computed(() =>
    this.permissionService.hasPluginPermission('users-permissions', 'user', 'findOne')
  );

  utilizationPercentage = computed(() => {
    const q = this.quota();
    if (!q || q.max_contacts === 0) return 0;
    return Math.round((q.current_contacts / q.max_contacts) * 100);
  });

  availableSlots = computed(() => {
    const q = this.quota();
    if (!q) return 0;
    return Math.max(0, q.max_contacts - q.current_contacts);
  });

  ngOnInit(): void {
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.initializeForm();
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.loadQuota();
    this.loadCountries();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
    this.pageTitleService.resetBreadcrumbs();
  }

  private initializeForm(): void {
    this.quotaForm = this.fb.group({
      max_contacts: [null, [Validators.required, Validators.min(1)]],
      priority_level: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      target_countries: [[]]
    });
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.quota-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.quota-detail.commercial')
      },
      {
        label: this.translate.instant('breadcrumbs.quota-detail.quotas'),
        route: '/admin/commercial/quotas'
      },
      {
        label: this.translate.instant('quota-detail.title'),
        active: true
      }
    ]);
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.updateCountryOptions();
    }, 150);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('quota-detail.title'));
  }

  private loadQuota(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (!documentId) {
      this.router.navigate(['/admin/commercial/quotas']);
      return;
    }

    this.loading.set(true);
    this.adminSalesService.getQuotaById(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.quota.set(response.data);
          this.populateForm();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/admin/commercial/quotas']);
        }
      });
  }

  private loadCountries(): void {
    this.adminService.getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.countries.set(response.data.filter(c => c.is_active));
          this.updateCountryOptions();
        },
        error: (err) => {
          console.error('Error loading countries:', err);
        }
      });
  }

  private updateCountryOptions(): void {
    this.countryOptions.set(
      this.countries().map(country => ({
        value: country.documentId,
        label: `${country.flag || ''} ${country.name}`.trim()
      }))
    );
  }

  private populateForm(): void {
    const q = this.quota();
    if (!q) return;

    this.quotaForm.patchValue({
      max_contacts: q.max_contacts,
      priority_level: q.priority_level,
      target_countries: q.target_countries?.map(c => c.documentId) || []
    });
  }

  enableEditMode(): void {
    if (!this.canUpdate()) return;
    this.isEditMode.set(true);
    this.populateForm();

    setTimeout(() => {
      const editSection = document.querySelector('.card-body form');
      if (editSection) {
        editSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
    this.populateForm();
  }

  saveChanges(): void {
    if (!this.quotaForm.valid || !this.canUpdate()) return;

    const q = this.quota();
    if (!q) return;

    this.saving.set(true);

    const formValue = this.quotaForm.value;

    // CORRECTION: Envoyer juste les IDs, pas des objets avec documentId
    const updateData: any = {
      max_contacts: formValue.max_contacts,
      priority_level: formValue.priority_level,
      target_countries: formValue.target_countries // Déjà un tableau d'IDs
    };

    this.adminSalesService.updateQuota(q.documentId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('quota-detail.toast.update_success')
          );
          this.isEditMode.set(false);
          this.loadQuota();
          this.saving.set(false);
        },
        error: (err) => {
          console.error('Update error:', err);
          this.toastService.showError(
            this.translate.instant('quota-detail.toast.update_error')
          );
          this.saving.set(false);
        }
      });
  }

  getCountryById(documentId: string): Country | undefined {
    return this.countries().find(c => c.documentId === documentId);
  }

  goBack(): void {
    this.router.navigate(['/admin/commercial/quotas']);
  }

  goToUserProfile(): void {
    const q = this.quota();
    if (!q?.sales_rep) return;

    this.router.navigate(['/admin/team/users', q.sales_rep.documentId]);
  }

  getQuotaTypeBadgeType(type: QuotaType): BadgeType {
    const types: Record<QuotaType, BadgeType> = {
      weekly: 'primary',
      monthly: 'info'
    };
    return types[type] || 'secondary';
  }

  getPriorityBadgeType(priority: number): BadgeType {
    if (priority >= 4) return 'danger';
    if (priority === 3) return 'warning';
    if (priority === 2) return 'info';
    return 'secondary';
  }

  getUtilizationBadgeType(): BadgeType {
    const percentage = this.utilizationPercentage();
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'info';
    return 'success';
  }

  translateQuotaType(type: QuotaType): string {
    return this.translate.instant(`quota-detail.types.${type}`);
  }

  getSalesRepName(): string {
    const q = this.quota();
    if (!q?.sales_rep) return this.translate.instant('quota-detail.no_rep');
    return `${q.sales_rep.first_name} ${q.sales_rep.last_name}`;
  }

  toggleStatus(): void {
    const q = this.quota();
    if (!q || !this.canUpdate()) return;

    const newStatus = !q.is_active;
    const messageKey = newStatus ? 'activate' : 'deactivate';

    this.confirmDialog.open({
      title: this.translate.instant(`quota-detail.${messageKey}.title`),
      message: this.translate.instant(`quota-detail.${messageKey}.message`),
      confirmText: this.translate.instant(`quota-detail.${messageKey}.confirm`),
      confirmClass: newStatus ? 'btn-success' : 'btn-warning',
      icon: newStatus ? 'check_circle' : 'cancel',
      iconClass: newStatus ? 'text-success' : 'text-warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.updateQuota(q.documentId, { is_active: newStatus })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant(`quota-detail.toast.${messageKey}_success`)
              );
              this.loadQuota();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant(`quota-detail.toast.${messageKey}_error`)
              );
            }
          });
      }
    });
  }

  deleteQuota(): void {
    const q = this.quota();
    if (!q || !this.canDelete()) return;

    const repName = this.getSalesRepName();

    this.confirmDialog.confirmDelete(repName).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.deleteQuota(q.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('quota-detail.toast.delete_success')
              );
              this.router.navigate(['/admin/commercial/quotas']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('quota-detail.toast.delete_error')
              );
            }
          });
      }
    });
  }
}
