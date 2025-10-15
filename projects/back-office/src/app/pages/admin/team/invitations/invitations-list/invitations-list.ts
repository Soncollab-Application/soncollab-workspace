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
  ConfirmDialogService, UrlStateService
} from "shared-lib";
import {Subject, takeUntil} from 'rxjs';
import {InvitationListItem, InvitationStatus, TargetRole} from '../../../../../core/models/admin/invitation.model';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [FilterBarComponent, DataTableComponent, Breadcrumb, TranslatePipe],
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
  private route = inject(ActivatedRoute);
  private urlState = inject(UrlStateService);

  private destroy$ = new Subject<void>();
  private componentId = 'invitations-list';

  currentTitle = this.pageTitleService.currentTitle;

  invitations = signal<InvitationListItem[]>([]);
  loading = signal(false);

  currentPage = signal(1);
  pageSize = signal(25);
  totalInvitations = signal(0);
  pageCountValue = signal(0);

  searchTerm = signal('');
  filterValues = signal<FilterValue>({});
  currentSort = signal<SortConfig>({ field: 'createdAt', direction: 'desc' });

  pagination = computed<PaginationState>(() => ({
    currentPage: this.currentPage(),
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

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const size = this.pageSize();
      const search = this.searchTerm();
      const filters = this.filterValues();
      const sort = this.currentSort();

      untracked(() => {
        if (this.canFind()) {
          this.loadInvitations(page, size, filters, sort.field, sort.direction);
        }
      });
    });
  }

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.initializeConfig();
    this.initializeFromUrl();
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

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('invitations.filters.status'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: '', label: this.translate.instant('common.all') },
          { value: 'pending', label: this.translate.instant('invitations.status.pending') },
          { value: 'sent', label: this.translate.instant('invitations.status.sent') },
          { value: 'accepted', label: this.translate.instant('invitations.status.accepted') },
          { value: 'expired', label: this.translate.instant('invitations.status.expired') },
          { value: 'cancelled', label: this.translate.instant('invitations.status.cancelled') }
        ]
      },
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('invitations.filters.role'),
        placeholder: this.translate.instant('common.all'),
        options: [
          { value: '', label: this.translate.instant('common.all') },
          { value: 'soncollab_admin', label: this.translate.instant('invitations.roles.soncollab_admin') },
          { value: 'soncollab_sales', label: this.translate.instant('invitations.roles.soncollab_sales') },
          { value: 'soncollab_content', label: this.translate.instant('invitations.roles.soncollab_content') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt:desc', label: this.translate.instant('invitations.sort.newest') },
      { value: 'createdAt:asc', label: this.translate.instant('invitations.sort.oldest') },
      { value: 'email:asc', label: this.translate.instant('invitations.sort.email') }
    ]);

    this.columns.set([
      {
        key: 'email',
        label: this.translate.instant('invitations.columns.email'),
        sortable: true,
        render: (row: InvitationListItem) => `
          <div class="d-flex align-items-center">
            <i class="bi bi-envelope me-2 text-muted"></i>
            <span>${row.email}</span>
          </div>
        `
      },
      {
        key: 'name',
        label: this.translate.instant('invitations.columns.name'),
        sortable: true,
        render: (row: InvitationListItem) => `
          <strong>${row.first_name} ${row.last_name}</strong>
        `
      },
      {
        key: 'target_role',
        label: this.translate.instant('invitations.columns.role'),
        sortable: true,
        type: 'custom-badge',
        render: (row: InvitationListItem) => {
          const badgeType = this.getRoleBadgeType(row.target_role);
          const roleText = this.translate.instant(`invitations.roles.${row.target_role}`);
          let html = `<span class="badge bg-${badgeType}">${roleText}</span>`;
          if (row.department) {
            html += `<small class="d-block text-muted mt-1">${this.translate.instant(`invitations.departments.${row.department}`)}</small>`;
          }
          return html;
        }
      },
      {
        key: 'invitation_status',
        label: this.translate.instant('invitations.columns.status'),
        sortable: true,
        type: 'custom-badge',
        render: (row: InvitationListItem) => {
          const badgeType = this.getStatusBadgeType(row.invitation_status);
          const statusText = this.translate.instant(`invitations.status.${row.invitation_status}`);
          return `<span class="badge bg-${badgeType}">${statusText}</span>`;
        }
      },
      {
        key: 'invited_by',
        label: this.translate.instant('invitations.columns.invited_by'),
        render: (row: InvitationListItem) => {
          if (row.invited_by) {
            return `<small>${row.invited_by.first_name} ${row.invited_by.last_name}</small>`;
          }
          return '<span class="text-muted">-</span>';
        }
      },
      {
        key: 'sent_at',
        label: this.translate.instant('invitations.columns.sent_at'),
        sortable: true,
        render: (row: InvitationListItem) => {
          if (row.sent_at) {
            return `<small>${new Date(row.sent_at).toLocaleString()}</small>`;
          }
          return '<span class="text-muted">-</span>';
        }
      },
      {
        key: 'expires_at',
        label: this.translate.instant('invitations.columns.expires_at'),
        sortable: true,
        render: (row: InvitationListItem) => {
          if (row.expires_at) {
            const isExpiring = this.isExpiringSoon(row.expires_at);
            const dateStr = new Date(row.expires_at).toLocaleString();
            if (isExpiring) {
              return `<small class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>${dateStr}</small>`;
            }
            return `<small>${dateStr}</small>`;
          }
          return '<span class="text-muted">-</span>';
        }
      }
    ]);

    const baseActions: TableAction<InvitationListItem>[] = [
      {
        label: this.translate.instant('common.view'),
        icon: 'eye',
        class: 'btn-outline-secondary',
        handler: (row: InvitationListItem) => this.viewInvitation(row)
      }
    ];

    if (this.canResend()) {
      baseActions.push({
        label: this.translate.instant('invitations.actions.resend'),
        icon: 'send',
        class: 'btn-outline-primary',
        condition: (row: InvitationListItem) =>
          row.invitation_status === 'pending' || row.invitation_status === 'sent',
        handler: (row: InvitationListItem) => this.resendInvitation(row)
      });
    }

    if (this.canCancel()) {
      baseActions.push({
        label: this.translate.instant('invitations.actions.cancel'),
        icon: 'x-circle',
        class: 'btn-outline-warning',
        condition: (row: InvitationListItem) =>
          row.invitation_status === 'pending' || row.invitation_status === 'sent',
        handler: (row: InvitationListItem) => this.cancelInvitation(row)
      });
    }

    if (this.canDelete()) {
      baseActions.push({
        label: this.translate.instant('common.delete'),
        icon: 'trash',
        class: 'btn-outline-danger',
        handler: (row: InvitationListItem) => this.deleteInvitation(row)
      });
    }

    this.actions.set(baseActions);

    this.emptyTitle.set(this.translate.instant('invitations.no_invitations'));
    this.emptyMessage.set(this.translate.instant('invitations.no_invitations_message'));
  }

  private initializeFromUrl(): void {
    const urlState = this.urlState.getStateFromUrl(this.route);

    if (urlState.search) {
      this.searchTerm.set(urlState.search);
    }

    if (urlState.filters) {
      this.filterValues.set(urlState.filters);
    }

    if (urlState.sort) {
      this.currentSort.set(urlState.sort);
    }

    if (urlState.page) {
      this.currentPage.set(urlState.page);
    }
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
    }, 150);
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.invitations.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.invitations.team')
      },
      {
        label: this.translate.instant('breadcrumbs.invitations.invitations'),
        active: true
      }
    ]);
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
    this.loading.set(true);

    const params: any = {
      page,
      pageSize,
      sort: `${sortField}:${sortDirection}`
    };

    if (filters['status']) {
      params.status = filters['status'];
    }

    if (filters['role']) {
      params.role = filters['role'];
    }

    this.adminService.getInvitations(params)
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

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.currentPage.set(1);
  }

  onFilterChange(filterValues: FilterValue): void {
    this.filterValues.set(filterValues);
    this.currentPage.set(1);
  }

  onSortChange(sort: SortConfig): void {
    this.currentSort.set(sort);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
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
      title: this.translate.instant('invitations.confirm.resend.title'),
      message: this.translate.instant('invitations.confirm.resend.message', { name: inviteeName }),
      confirmText: this.translate.instant('invitations.actions.resend'),
      confirmClass: 'btn-primary',
      icon: 'send',
      iconClass: 'text-primary'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.resendInvitation(invitation.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              const sort = this.currentSort();
              this.loadInvitations(
                this.currentPage(),
                this.pageSize(),
                this.filterValues(),
                sort.field,
                sort.direction
              );
            },
            error: (err) => {
              console.error('Error resending invitation:', err);
            }
          });
      }
    });
  }

  cancelInvitation(invitation: InvitationListItem): void {
    if (!this.canCancel()) return;

    const inviteeName = `${invitation.first_name} ${invitation.last_name}`;

    this.confirmDialog.open({
      title: this.translate.instant('invitations.confirm.cancel.title'),
      message: this.translate.instant('invitations.confirm.cancel.message', { name: inviteeName }),
      confirmText: this.translate.instant('invitations.actions.cancel'),
      confirmClass: 'btn-warning',
      icon: 'x-circle',
      iconClass: 'text-warning'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.cancelInvitation(invitation.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              const sort = this.currentSort();
              this.loadInvitations(
                this.currentPage(),
                this.pageSize(),
                this.filterValues(),
                sort.field,
                sort.direction
              );
            },
            error: (err) => {
              console.error('Error canceling invitation:', err);
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
              const sort = this.currentSort();
              this.loadInvitations(
                this.currentPage(),
                this.pageSize(),
                this.filterValues(),
                sort.field,
                sort.direction
              );
            },
            error: (err) => {
              console.error('Error deleting invitation:', err);
            }
          });
      }
    });
  }

  private getStatusBadgeType(status: InvitationStatus): string {
    const types: Record<InvitationStatus, string> = {
      pending: 'warning',
      sent: 'info',
      accepted: 'success',
      expired: 'danger',
      cancelled: 'secondary'
    };
    return types[status] || 'secondary';
  }

  private getRoleBadgeType(role: TargetRole): string {
    const types: Record<TargetRole, string> = {
      soncollab_admin: 'danger',
      soncollab_sales: 'primary',
      soncollab_content: 'info'
    };
    return types[role] || 'secondary';
  }

  private isExpiringSoon(expiresAt: string): boolean {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 3;
  }

  canCreateInvitation(): boolean {
    return this.canInvite();
  }
}
