import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {AdminService} from '../../../../../core/services/admin/admin.service';
import {Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {TranslateService, TranslatePipe} from '@ngx-translate/core';
import {
  FilterBarComponent,
  FilterConfig,
  FilterValue,
  LanguageOrchestratorService,
  PermissionService,
  SortConfig,
  SortOption,
  ConfirmDialogService,
  ToastService,
  KpiCardComponent,
  KpiData,
  ListStateManager,
  ListStateConfig, DataList, ListColumn, ListAction,
} from "shared-lib";
import {Subject, takeUntil} from 'rxjs';
import {
  Department,
  InvitationFilters,
  InvitationListItem,
  InvitationStatus,
  TargetRole
} from '../../../../../core/models/admin/invitation.model';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {InviteOffcanvas} from '../../../../../core/components/admin/offcanvas/invite-offcanvas/invite-offcanvas';
import {InviteOffcanvasService} from '../../../../../core/services/admin/offcanvas/invite-offcanvas.service';

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [FilterBarComponent, Breadcrumb, TranslatePipe, InviteOffcanvas, KpiCardComponent, DataList],
  templateUrl: './invitations-list.html',
  styleUrl: './invitations-list.css',
  providers: [ListStateManager]
})
export class InvitationsList implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private inviteOffcanvasService = inject(InviteOffcanvasService);
  private toastService = inject(ToastService);

  protected listManager = inject(ListStateManager<InvitationListItem, InvitationFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'invitations-list';

  currentTitle = this.pageTitleService.currentTitle;

  canFind = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'find')
  );

  canInvite = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'invite')
  );

  canResend = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'resend')
  );

  canCancel = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'cancel')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('soncollab-invitation', 'soncollab-invitation', 'delete')
  );

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<InvitationListItem>[]>([]);
  actions = signal<ListAction<InvitationListItem>[]>([]);

  emptyTitle = signal<string>('');
  emptyMessage = signal<string>('');

  stats = signal<any>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);


  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    if (!statsData) return [];
    this.languageChange();
    return [
      {
        label: this.translate.instant('invitations-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'mail',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('invitations-list.kpi.pending'),
        value: statsData.pending || 0,
        icon: 'schedule',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      },
      {
        label: this.translate.instant('invitations-list.kpi.sent'),
        value: statsData.sent || 0,
        icon: 'send',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('invitations-list.kpi.accepted'),
        value: statsData.accepted || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('invitations-list.kpi.success_rate'),
        value: `${statsData.success_rate || 0}%`,
        icon: 'trending_up',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      }
    ];
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.loadStats();

    const defaultSort: SortConfig = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value.split(':')[0], direction: 'desc' }
      : { field: 'createdAt', direction: 'desc' };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 10,
      onLanguageChange: () => this.onLanguageChange()
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildInvitationsFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadInvitations(page, pageSize, filters, sortField, sortDirection),
      this.canFind
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.adminService.getInvitationStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats.set(response.data);
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats.set(false);
        }
      });
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('invitations-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: this.getStatusOptions()
      },
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('invitations-list.filters.role'),
        placeholder: this.translate.instant('common.all'),
        options: this.getRoleOptions()
      },
      {
        key: 'department',
        type: 'select',
        label: this.translate.instant('invitations-list.filters.department'),
        placeholder: this.translate.instant('common.all'),
        options: this.getDepartmentOptions()
      }
    ]);

    this.sortOptions.set(this.getSortOptions());

    this.columns.set([
      {
        key: 'email',
        label: this.translate.instant('invitations-list.columns.email'),
        sortable: true,
        type: 'email'
      },
      {
        key: 'first_name',
        label: this.translate.instant('invitations-list.columns.name'),
        sortable: true,
        type: 'text',
        render: (row: InvitationListItem) => `${row.first_name} ${row.last_name}`
      },
      {
        key: 'target_role',
        label: this.translate.instant('invitations-list.columns.role'),
        type: 'custom-badge',
        render: (row: InvitationListItem) => this.translateRole(row.target_role),
        cellClass: 'bg-primary-subtle text-primary'
      },
      {
        key: 'department',
        label: this.translate.instant('invitations-list.columns.department'),
        sortable: false,
        type: 'text',
        render: (row: InvitationListItem) => row.department
          ? this.translate.instant(`invitations-list.departments.${row.department}`)
          : '-'
      },
      {
        key: 'invitation_status',
        label: this.translate.instant('invitations-list.columns.status'),
        type: 'custom-badge',
        render: (row: InvitationListItem) => this.translateStatus(row.invitation_status),
        cellClass: (row: InvitationListItem) => this.getStatusClass(row.invitation_status)
      },
      {
        key: 'invited_by',
        label: this.translate.instant('invitations-list.columns.invited_by'),
        type: 'text',
        render: (row: InvitationListItem) => {
          if (row.invited_by?.first_name && row.invited_by?.last_name) {
            return `${row.invited_by.first_name} ${row.invited_by.last_name}`;
          }
          return row.invited_by?.username || '-';
        }
      },
      {
        key: 'sent_at',
        label: this.translate.instant('invitations-list.columns.sent_at'),
        sortable: true,
        type: 'date',
        colspan: 2
      }
    ]);

    const baseActions: ListAction<InvitationListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (row: InvitationListItem) => this.viewInvitation(row)
      }
    ];

    if (this.canResend()) {
      baseActions.push({
        label: this.translate.instant('invitations-list.actions.resend'),
        icon: 'send',
        class: 'btn-outline-primary',
        condition: (row: InvitationListItem) =>
          row.invitation_status === 'pending' || row.invitation_status === 'sent',
        handler: (row: InvitationListItem) => this.resendInvitation(row)
      });
    }

    if (this.canCancel()) {
      baseActions.push({
        label: this.translate.instant('invitations-list.actions.cancel'),
        icon: 'cancel',
        class: 'btn-outline-warning',
        condition: (row: InvitationListItem) =>
          row.invitation_status === 'pending' || row.invitation_status === 'sent',
        handler: (row: InvitationListItem) => this.cancelInvitation(row)
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        handler: (row: InvitationListItem) => this.deleteInvitation(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('invitations-list.no_invitations'));
    this.emptyMessage.set(this.translate.instant('invitations-list.no_invitations_message'));
  }

  private buildInvitationsFilters(search: string, filterValues: FilterValue): InvitationFilters {
    const filters: InvitationFilters = {};

    if (search) {
      filters.search = search;
    }

    if (filterValues['status']) {
      filters.status = filterValues['status'] as InvitationStatus;
    }

    if (filterValues['role']) {
      filters.role = filterValues['role'] as TargetRole;
    }

    if (filterValues['department']) {
      filters.department = filterValues['department'] as Department;
    }

    return filters;
  }

  private translateRole(role: TargetRole): string {
    const roleKey = `invitations-list.roles.${role}`;
    return this.translate.instant(roleKey);
  }

  private translateStatus(status: InvitationStatus): string {
    const statusKey = `invitations-list.status.${status}`;
    return this.translate.instant(statusKey);
  }

  private getStatusClass(status: InvitationStatus): string {
    const classes = {
      pending: 'bg-warning-subtle text-warning',
      sent: 'bg-info-subtle text-info',
      accepted: 'bg-success-subtle text-success',
      expired: 'bg-danger-subtle text-danger',
      cancelled: 'bg-secondary-subtle text-secondary'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
      this.languageChange.update(v => v + 1);
    }, 150);
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
        active: true
      }
    ]);
  }

  private getSortOptions(): SortOption[] {
    return [
      { value: 'createdAt', label: this.translate.instant('invitations-list.sort.newest') },
      { value: 'email', label: this.translate.instant('invitations-list.sort.email') }
    ];
  }

  private getDepartmentOptions(): { value: Department; label: string }[] {
    const departments: Department[] = ['admin', 'sales', 'marketing', 'content', 'support'];
    return departments.map(dept => ({
      value: dept,
      label: this.translate.instant(`invitations-list.departments.${dept}`)
    }));
  }

  private getRoleOptions(): { value: TargetRole; label: string }[] {
    const roles: TargetRole[] = ['soncollab_admin', 'soncollab_sales', 'soncollab_content'];
    return roles.map(role => ({
      value: role,
      label: this.translate.instant(`invitations-list.roles.${role}`)
    }));
  }

  private getStatusOptions(): { value: InvitationStatus; label: string }[] {
    const statuses: InvitationStatus[] = ['pending', 'sent', 'accepted', 'expired', 'cancelled'];
    return statuses.map(status => ({
      value: status,
      label: this.translate.instant(`invitations-list.status.${status}`)
    }));
  }

  openInviteOffcanvas(): void {
    this.inviteOffcanvasService.open(() => {
      this.listManager.reload();
    });
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.team.invitations'));
  }

  private loadInvitations(
    page: number,
    pageSize: number,
    filters: InvitationFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.adminService.getInvitations(page, pageSize, filters, sortField, sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.listManager.setData(
            response.data,
            response.meta.pagination.total,
            response.meta.pagination.pageCount
          );
        },
        error: (err) => {
          console.error('Error loading invitations:', err);
          this.listManager.setError();
        }
      });
  }

  onActionClick(event: { action: ListAction<InvitationListItem>; row: InvitationListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(invitation: InvitationListItem): void {
    this.viewInvitation(invitation);
  }

  viewInvitation(invitation: InvitationListItem): void {
    this.router.navigate(['/admin/team/invitations', invitation.documentId]);
  }

  resendInvitation(invitation: InvitationListItem): void {
    if (!this.canResend()) return;

    const inviteeName = `${invitation.first_name} ${invitation.last_name}`;

    this.confirmDialog.open({
      title: this.translate.instant('invitations-list.confirm.resend.title'),
      message: this.translate.instant('invitations-list.confirm.resend.message', { name: inviteeName }),
      confirmText: this.translate.instant('invitations-list.actions.resend'),
      confirmClass: 'btn-primary',
      icon: 'send',
      iconClass: 'text-primary'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.resendInvitation(invitation.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.resend_success', { name: inviteeName })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.resend_error', { name: inviteeName })
              );
            }
          });
      }
    });
  }

  cancelInvitation(invitation: InvitationListItem): void {
    if (!this.canCancel()) return;

    const inviteeName = `${invitation.first_name} ${invitation.last_name}`;

    this.confirmDialog.open({
      title: this.translate.instant('invitations-list.confirm.cancel.title'),
      message: this.translate.instant('invitations-list.confirm.cancel.message', { name: inviteeName }),
      confirmText: this.translate.instant('invitations-list.actions.cancel'),
      confirmClass: 'btn-warning',
      icon: 'cancel',
      iconClass: 'text-warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.cancelInvitation(invitation.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.cancel_success', { name: inviteeName })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.cancel_error', { name: inviteeName })
              );
            }
          });
      }
    });
  }

  deleteInvitation(invitation: InvitationListItem): void {
    if (!this.canDelete()) return;

    const inviteeName = `${invitation.first_name} ${invitation.last_name}`;

    this.confirmDialog.confirmDelete(inviteeName).then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteInvitation(invitation.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('invitations-list.toast.delete_success', { name: inviteeName })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('invitations-list.toast.delete_error', { name: inviteeName })
              );
            }
          });
      }
    });
  }

  canCreateInvitation(): boolean {
    return this.canInvite();
  }
}
