import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {
  Badge,
  BadgeType,
  ConfirmDialogService,
  getUserInitials,
  getUserFullName,
  LanguageOrchestratorService,
  PermissionService,
  RelativeDatePipe,
  ToastService,
} from "shared-lib";
import { AdminService } from "../../../../../core/services/admin/admin.service";
import {ActivatedRoute, Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {InvitationListItem} from '../../../../../core/models/admin/invitation.model';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-invitation-detail',
  imports: [Breadcrumb, TranslatePipe, Badge, RelativeDatePipe],
  templateUrl: './invitation-detail.html',
  styleUrl: './invitation-detail.css'
})
export class InvitationDetail implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionsService = inject(PermissionService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();
  private componentId = 'invitation-detail';

  invitation = signal<InvitationListItem | null>(null);
  loading = signal(false);

  canResend = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'resend')
  );

  canCancel = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'cancel')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'delete')
  );

  showResendButton = computed(() => {
    const inv = this.invitation();
    return inv && this.canResend() &&
      (inv.invitation_status === 'pending' || inv.invitation_status === 'sent');
  });

  showCancelButton = computed(() => {
    const inv = this.invitation();
    return inv && this.canCancel() &&
      (inv.invitation_status === 'pending' || inv.invitation_status === 'sent');
  });

  isExpired = computed(() => {
    const inv = this.invitation();
    return inv?.invitation_status === 'expired';
  });

  isAccepted = computed(() => {
    const inv = this.invitation();
    return inv?.invitation_status === 'accepted';
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.loadInvitation();
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
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
        label: this.translate.instant('breadcrumbs.invitations-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.invitations-list.team')
      },
      {
        label: this.translate.instant('breadcrumbs.invitations-list.invitations'),
        route: '/admin/team/invitations'
      },
      {
        label: this.translate.instant('invitation-detail.title'),
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
    this.pageTitleService.setTitle(this.translate.instant('invitation-detail.title'));
  }

  private loadInvitation(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (!documentId) {
      this.router.navigate(['/admin/team/invitations']);
      return;
    }

    this.loading.set(true);
    this.adminService.getInvitationById(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.invitation.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/admin/team/invitations']);
        }
      });
  }

  resendInvitation(): void {
    const inv = this.invitation();
    if (!inv || !this.canResend()) return;

    const name = getUserFullName(inv);

    this.confirmDialog.open({
      title: this.translate.instant('invitations-list.confirm.resend.title'),
      message: this.translate.instant('invitations-list.confirm.resend.message', { name }),
      confirmText: this.translate.instant('invitations-list.actions.resend'),
      confirmClass: 'btn-primary',
      icon: 'send',
      iconClass: 'text-primary'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.resendInvitation(inv.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.resend_success', { name })
              );
              this.loadInvitation();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.resend_error', { name })
              );
            }
          });
      }
    });
  }

  cancelInvitation(): void {
    const inv = this.invitation();
    if (!inv || !this.canCancel()) return;

    const name = getUserFullName(inv);

    this.confirmDialog.open({
      title: this.translate.instant('invitations-list.confirm.cancel.title'),
      message: this.translate.instant('invitations-list.confirm.cancel.message', { name }),
      confirmText: this.translate.instant('invitations-list.actions.cancel'),
      confirmClass: 'btn-warning',
      icon: 'cancel',
      iconClass: 'text-warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.cancelInvitation(inv.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.cancel_success', { name })
              );
              this.loadInvitation();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.cancel_error', { name })
              );
            }
          });
      }
    });
  }

  deleteInvitation(): void {
    const inv = this.invitation();
    if (!inv || !this.canDelete()) return;

    const name = getUserFullName(inv);

    this.confirmDialog.confirmDelete(name).then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteInvitation(inv.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.delete_success', { name })
              );
              this.router.navigate(['/admin/team/invitations']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.delete_error', { name })
              );
            }
          });
      }
    });
  }

  getInviteeName(): string {
    return getUserFullName(this.invitation());
  }

  getInviteeInitials(): string {
    return getUserInitials(this.invitation());
  }

  translateRole(role: string): string {
    return this.translate.instant(`invitations-list.roles.${role}`);
  }

  translateStatus(status: string): string {
    return this.translate.instant(`invitations-list.status.${status}`);
  }

  getStatusBadgeType(status: string): BadgeType {
    const types: Record<string, BadgeType> = {
      pending: 'warning',
      sent: 'info',
      accepted: 'success',
      expired: 'danger',
      cancelled: 'secondary'
    };
    return types[status] || 'secondary';
  }

  getRoleBadgeType(role: string): BadgeType {
    const types: Record<string, BadgeType> = {
      soncollab_admin: 'danger',
      soncollab_sales: 'primary',
      soncollab_content: 'info'
    };
    return types[role] || 'secondary';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'schedule',
      sent: 'send',
      accepted: 'check_circle',
      expired: 'cancel',
      cancelled: 'block'
    };
    return icons[status] || 'mail';
  }

  getPermissionKeys(): string[] {
    const inv = this.invitation();
    return inv?.permissions ? Object.keys(inv.permissions) : [];
  }

  goBack(): void {
    this.router.navigate(['/admin/team/invitations']);
  }
}
