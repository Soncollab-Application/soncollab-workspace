import {Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from '@angular/core';
import {AdminService} from '../../../../../core/services/admin/admin.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {TranslateService, TranslatePipe} from '@ngx-translate/core';
import {
  FilterBarComponent,
  DataTableComponent,
  FilterConfig,
  FilterValue,
  LanguageOrchestratorService,
  PaginationState,
  PermissionService,
  SortConfig,
  SortOption,
  TableAction,
  TableColumn,
  ConfirmDialogService, UrlStateService,
  ToastService,
  KpiCardComponent,
  KpiData, FilterStateService
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
import {InviteOffcanvas} from '../../../../../core/components/admin/invite-offcanvas/invite-offcanvas';
import {InviteOffcanvasService} from '../../../../../core/services/admin/invite-offcanvas.service';

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [FilterBarComponent, DataTableComponent, Breadcrumb, TranslatePipe, InviteOffcanvas, KpiCardComponent ],
  templateUrl: './invitations-list.html',
  styleUrl: './invitations-list.css'
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
  private filterState = inject(FilterStateService);

  private destroy$ = new Subject<void>();
  private componentId = 'invitations-list';

  currentTitle = this.pageTitleService.currentTitle;

  invitations = signal<InvitationListItem[]>([]);
  loading = signal(false);

  currentPage = signal(1);
  pageSize = signal(10);
  totalInvitations = signal(0);
  pageCountValue = signal(0);

  currentSort = computed(() => this.filterState.state().sort);

  private loadingState = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  pagination = computed<PaginationState>(() => ({
    currentPage: this.filterState.state().page,
    pageSize: this.pageSize(),
    total: this.totalInvitations(),
    pageCount: this.pageCountValue()
  }));

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
  columns = signal<TableColumn<InvitationListItem>[]>([]);
  actions = signal<TableAction<InvitationListItem>[]>([]);

  emptyTitle = signal<string>('');
  emptyMessage = signal<string>('');

  stats = signal<any>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);


  constructor() {
    effect(() => {
      if (!this.filterState.initialized()) {
        return;
      }

      const currentLoadingState = this.loadingState();
      const shouldLoadDueToStateChange = this.filterState.shouldLoad();

      if (shouldLoadDueToStateChange && currentLoadingState !== 'idle') {
        untracked(() => this.loadingState.set('idle'));
      }

      const shouldLoad = shouldLoadDueToStateChange || currentLoadingState === 'idle';

      if (!shouldLoad || currentLoadingState === 'loading') {
        return;
      }

      const state = this.filterState.state();

      untracked(() => {
        if (this.canFind()) {
          this.loadInvitations(
            state.page,
            this.pageSize(),
            this.buildInvitationsFilters(state.search, state.filters),
            state.sort.field || 'createdAt',
            state.sort.direction
          );
        }
      });

    });
  }

  ngOnInit(): void {
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.loadStats();

    const defaultSort: SortConfig = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' }
      : { field: 'createdAt', direction: 'desc' };

    this.filterState.initialize(defaultSort);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
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

  private initializeConfig(): void {
    // Plus besoin d'option vide, le placeholder suffit
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('invitations-list.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'pending', label: this.translate.instant('invitations-list.status.pending') },
          { value: 'sent', label: this.translate.instant('invitations-list.status.sent') },
          { value: 'accepted', label: this.translate.instant('invitations-list.status.accepted') },
          { value: 'expired', label: this.translate.instant('invitations-list.status.expired') },
          { value: 'cancelled', label: this.translate.instant('invitations-list.status.cancelled') }
        ]
      },
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('invitations-list.filters.role'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: 'soncollab_admin', label: this.translate.instant('invitations-list.roles.soncollab_admin') },
          { value: 'soncollab_sales', label: this.translate.instant('invitations-list.roles.soncollab_sales') },
          { value: 'soncollab_content', label: this.translate.instant('invitations-list.roles.soncollab_content') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('invitations-list.sort.newest') },
      { value: 'createdAt:asc', label: this.translate.instant('invitations-list.sort.oldest') },
      { value: 'email:asc', label: this.translate.instant('invitations-list.sort.email') }
    ]);

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

    const baseActions: TableAction<InvitationListItem>[] = [
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

  openInviteOffcanvas(): void {
    this.inviteOffcanvasService.open(() => {
      const state = this.filterState.state();
      this.loadInvitations(
        state.page,
        this.pageSize(),
        this.buildInvitationsFilters(state.search, state.filters),
        state.sort.field || 'createdAt',
        state.sort.direction
      );
    });
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.team.invitations'));
  }

  private loadInvitations(
    page: number,
    pageSize: number,
    filters: FilterValue,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {

    if (!this.canFind()) {
      return;
    }

    this.loadingState.set('loading');
    this.loading.set(true);

    this.adminService.getInvitations(page, pageSize, filters, sortField, sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.invitations.set(response.data);
          this.totalInvitations.set(response.meta.pagination.total);
          this.pageCountValue.set(response.meta.pagination.pageCount);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading invitations:', err);
          this.loading.set(false);
        }
      });
  }

  onPageChange(page: number): void {
    this.filterState.setPage(page);
  }

  onSortChange(sort: SortConfig): void {
    this.filterState.setSort(sort);
  }

  onActionClick(event: { action: TableAction<InvitationListItem>; row: InvitationListItem }): void {
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
              const state = this.filterState.state();
              this.loadInvitations(
                state.page,
                this.pageSize(),
                this.buildInvitationsFilters(state.search, state.filters),
                state.sort.field || 'createdAt',
                state.sort.direction
              );
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
              const state = this.filterState.state();
              this.loadInvitations(
                state.page,
                this.pageSize(),
                this.buildInvitationsFilters(state.search, state.filters),
                state.sort.field || 'createdAt',
                state.sort.direction
              );
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
              const state = this.filterState.state();
              this.loadInvitations(
                state.page,
                this.pageSize(),
                this.buildInvitationsFilters(state.search, state.filters),
                state.sort.field || 'createdAt',
                state.sort.direction
              );
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
