import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  Badge,
  BadgeType,
  ConfirmDialogService,
  LanguageOrchestratorService,
  PermissionService,
  RelativeDatePipe,
  ToastService,
} from 'shared-lib';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { SalesContact, SalesContactStatus, UrgencyLevel } from '../../../../../core/models/sales/sales-contact.model';
import { Subject, takeUntil } from 'rxjs';
import { AssignContactModal } from '../../../../../core/components/admin/modals/assign-contact-modal/assign-contact-modal';
import { QualifyContactModal } from '../../../../../core/components/admin/modals/qualify-contact-modal/qualify-contact-modal';
import { ContactModalService } from '../../../../../core/services/admin/modals/contact-modal.service';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [
    Breadcrumb,
    TranslatePipe,
    Badge,
    RelativeDatePipe,
    AssignContactModal,
    QualifyContactModal
  ],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.css'
})
export class ContactDetail implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionsService = inject(PermissionService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private contactModalService = inject(ContactModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'contact-detail';

  contact = signal<SalesContact | null>(null);
  loading = signal(false);

  canAssign = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'assign')
  );

  canQualify = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'qualify')
  );

  canConvert = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'convert')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'delete')
  );

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'update')
  );

  showAssignButton = computed(() => {
    const c = this.contact();
    return c && !c.assigned_to && this.canAssign();
  });

  showReassignButton = computed(() => {
    const c = this.contact();
    return c && !!c.assigned_to && this.canAssign();
  });

  showUnassignButton = computed(() => {
    const c = this.contact();
    return c && !!c.assigned_to && this.canAssign();
  });

  showQualifyButton = computed(() => {
    const c = this.contact();
    return c && ['new', 'contacted', 'interested'].includes(c.sales_contact_status) && this.canQualify();
  });

  showConvertButton = computed(() => {
    const c = this.contact();
    return c && !c.assigned_to && c.assignment_type !== 'outbound' && this.canConvert();
  });

  ngOnInit(): void {
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.setBreadcrumbs();
    this.updatePageTitle();
    this.loadContact();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
    this.pageTitleService.resetBreadcrumbs();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.contacts-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.contacts-list.commercial')
      },
      {
        label: this.translate.instant('breadcrumbs.contacts-list.all_contacts'),
        route: '/admin/commercial/contacts'
      },
      {
        label: this.translate.instant('contact-detail.title'),
        active: true
      }
    ]);
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
    }, 150);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('contact-detail.title'));
  }

  private loadContact(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (!documentId) {
      this.router.navigate(['/admin/commercial/contacts']);
      return;
    }

    this.loading.set(true);
    this.adminSalesService.getContactById(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.contact.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/admin/commercial/contacts']);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/commercial/contacts']);
  }

  getContactName(): string {
    const c = this.contact();
    if (!c) return '';
    return `${c.first_name} ${c.last_name}`;
  }

  getStatusBadgeType(status: SalesContactStatus): BadgeType {
    const types: Record<SalesContactStatus, BadgeType> = {
      new: 'info',
      contacted: 'primary',
      qualified: 'success',
      interested: 'warning',
      demo_scheduled: 'info',
      demo_completed: 'primary',
      proposal_sent: 'warning',
      negotiation: 'warning',
      converted: 'success',
      lost: 'danger'
    };
    return types[status] || 'secondary';
  }

  getUrgencyBadgeType(urgency: UrgencyLevel): BadgeType {
    const types: Record<UrgencyLevel, BadgeType> = {
      low: 'secondary',
      normal: 'info',
      high: 'warning',
      urgent: 'danger'
    };
    return types[urgency] || 'secondary';
  }

  getStatusIcon(status: SalesContactStatus): string {
    const icons: Record<SalesContactStatus, string> = {
      new: 'new_releases',
      contacted: 'mail',
      qualified: 'verified',
      interested: 'star',
      demo_scheduled: 'calendar_today',
      demo_completed: 'check_circle',
      proposal_sent: 'send',
      negotiation: 'handshake',
      converted: 'celebration',
      lost: 'cancel'
    };
    return icons[status] || 'info';
  }

  translateStatus(status: SalesContactStatus): string {
    return this.translate.instant(`contacts-list.statuses.${status}`);
  }

  translateType(type: string): string {
    return this.translate.instant(`contacts-list.types.${type}`);
  }

  translateUrgency(urgency: UrgencyLevel): string {
    return this.translate.instant(`contacts-list.urgencies.${urgency}`);
  }

  // ACTIONS ADMIN

  assignContact(): void {
    const c = this.contact();
    if (!c || !this.canAssign()) return;

    this.contactModalService.openAssign(c, () => {
      this.loadContact();
    });
  }

  reassignContact(): void {
    const c = this.contact();
    if (!c || !this.canAssign()) return;

    this.contactModalService.openReassign(c, () => {
      this.loadContact();
    });
  }

  unassignContact(): void {
    const c = this.contact();
    if (!c || !this.canAssign()) return;

    const name = this.getContactName();

    this.confirmDialog.open({
      title: this.translate.instant('contact-detail.unassign.title'),
      message: this.translate.instant('contact-detail.unassign.message', { name }),
      confirmText: this.translate.instant('contact-detail.unassign.confirm'),
      confirmClass: 'btn-warning',
      icon: 'person_remove',
      iconClass: 'text-warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.unassignContact(c.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('contact-detail.toast.unassign_success', { name })
              );
              this.loadContact();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('contact-detail.toast.unassign_error', { name })
              );
            }
          });
      }
    });
  }

  qualifyContact(): void {
    const c = this.contact();
    if (!c || !this.canQualify()) return;

    this.contactModalService.openQualify(c, () => {
      this.loadContact();
    });
  }

  convertToProspect(): void {
    const c = this.contact();
    if (!c || !this.canConvert()) return;

    const name = this.getContactName();

    this.confirmDialog.open({
      title: this.translate.instant('contact-detail.convert.title'),
      message: this.translate.instant('contact-detail.convert.message', { name }),
      confirmText: this.translate.instant('contact-detail.convert.confirm'),
      confirmClass: 'btn-success',
      icon: 'upgrade',
      iconClass: 'text-success'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.convertToProspect(c.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('contact-detail.toast.convert_success', { name })
              );
              this.loadContact();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('contact-detail.toast.convert_error', { name })
              );
            }
          });
      }
    });
  }

  deleteContact(): void {
    const c = this.contact();
    if (!c || !this.canDelete()) return;

    const name = this.getContactName();

    this.confirmDialog.confirmDelete(name).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.deleteContact(c.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('contact-detail.toast.delete_success', { name })
              );
              this.router.navigate(['/admin/commercial/contacts']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('contact-detail.toast.delete_error', { name })
              );
            }
          });
      }
    });
  }
}
