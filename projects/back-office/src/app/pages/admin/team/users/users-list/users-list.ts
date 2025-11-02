import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserFilters, UserListItem } from '../../../../../core/models/admin/user-list.model';
import { AdminService } from '../../../../../core/services/admin/admin.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  FilterConfig,
  FilterValue,
  SortConfig,
  SortOption,
  FilterBarComponent,
  PermissionService,
  LanguageOrchestratorService,
  ConfirmDialogService,
  ToastService,
  KpiData,
  KpiCardComponent,
  ListStateManager,
  ListStateConfig, DataList, ListColumn, ListAction,
} from 'shared-lib';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FilterBarComponent, Breadcrumb, TranslatePipe, KpiCardComponent, DataList],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
  providers: [ListStateManager]
})
export class UsersList implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  protected listManager = inject(ListStateManager<UserListItem, UserFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'users-list';

  canFindUsers = computed(() => this.permissionsService.canFindUsers());
  canManageUsers = computed(() => this.permissionsService.canUpdateUser());
  canCreateUser = computed(() => this.permissionsService.canCreateUser());
  canManageRoles = computed(() => this.permissionsService.canManageRoles());
  currentUserId = computed(() => this.authService.currentUser?.documentId);

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<UserListItem>[]>([]);
  actions = signal<ListAction<UserListItem>[]>([]);

  stats = signal<any>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);


  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    return [
      {
        label: this.translate.instant('users-list.kpi.total'),
        value: statsData.total || 0,
        icon: 'group',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('users-list.kpi.active'),
        value: statsData.by_status?.active || 0,
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('users-list.kpi.blocked'),
        value: statsData.by_status?.blocked || 0,
        icon: 'block',
        iconClass: 'text-danger',
        bgClass: 'bg-danger bg-opacity-10'
      },
      {
        label: this.translate.instant('users-list.kpi.confirmed'),
        value: statsData.by_confirmation?.confirmed || 0,
        icon: 'verified',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('users-list.kpi.activation_rate'),
        value: `${statsData.activation_rate || 0}%`,
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
    this.loadRoles();
    this.loadStats();

    const defaultSort: SortConfig = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'asc' }
      : { field: 'username', direction: 'asc' };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 10, // Valeur par défaut
      onLanguageChange: () => this.onLanguageChange()
    };

    // Initialisation du ListStateManager
    this.listManager.initialize(
      config,
      (search, filters) => this.buildUserFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadUsers(page, pageSize, filters, sortField, sortDirection),
      this.canFindUsers
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('users-list.filters.role'),
        placeholder: this.translate.instant('users-list.filters.allRoles'),
        options: []
      },
      {
        key: 'blocked',
        type: 'select',
        label: this.translate.instant('users-list.filters.state'),
        placeholder: this.translate.instant('users-list.filters.allStates'),
        options: this.getBlockedOptions()
      },
      {
        key: 'confirmed',
        type: 'select',
        label: this.translate.instant('users-list.filters.confirmation'),
        placeholder: this.translate.instant('users-list.filters.allStates'),
        options: this.getConfirmedOptions()
      }
    ]);

    this.sortOptions.set(this.getSortOptions());

    this.columns.set([
      {
        key: 'username',
        label: this.translate.instant('users-list.columns.user'),
        sortable: true,
        type: 'user',
        avatarKey: 'avatar.url',
        subtitleKey: 'email',
        avatarTransform: (url: string) => url ? `${environment.api.baseUrl}${url}` : '',
        render: (user) => {
          return user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username;
        }
      },
      {
        key: 'role',
        label: this.translate.instant('users-list.columns.role'),
        type: 'text',
        sortable: true,
        render: (user) => this.translateRole(user.role.type)
      },
      {
        key: 'confirmed',
        label: this.translate.instant('users-list.columns.confirmation'),
        type: 'custom-badge',
        render: (user) => user.confirmed
          ? this.translate.instant('users-list.badges.confirmed')
          : this.translate.instant('users-list.badges.notConfirmed'),
        cellClass: (user) => user.confirmed ? 'text-success bg-success-subtle' : 'text-warning bg-warning-subtle'
      },
      {
        key: 'blocked',
        label: this.translate.instant('users-list.columns.state'),
        type: 'custom-badge',
        render: (user) => user.blocked
          ? this.translate.instant('users-list.badges.blocked')
          : this.translate.instant('users-list.badges.active'),
        cellClass: (user) => user.blocked ? 'text-danger bg-danger-subtle' : 'text-success bg-success-subtle',
        colspan: 2
      }
    ]);

    this.actions.set([
      {
        label: this.translate.instant('users-list.actions.view'),
        icon: 'visibility',
        handler: (user) => this.viewUser(user)
      },
      {
        label: this.translate.instant('users-list.actions.block'),
        icon: 'lock',
        condition: (user) => this.canManageUsers() && !user.blocked && user.documentId !== this.currentUserId(),
        handler: (user) => this.blockUser(user)
      },
      {
        label: this.translate.instant('users-list.actions.unblock'),
        icon: 'lock_open',
        condition: (user) => this.canManageUsers() && user.blocked && user.documentId !== this.currentUserId(),
        handler: (user) => this.unblockUser(user)
      }
    ]);

    this.emptyTitle.set(this.translate.instant('users-list.no_users'));
    this.emptyMessage.set(this.translate.instant('users-list.no_users_message'));
  }

  private loadRoles(): void {
    if (!this.canManageRoles()) {
      return;
    }

    this.adminService.getRoles().subscribe({
      next: (response) => {
        const roleOptions = response.roles
          .filter((role: any) => role.type !== 'public' && role.type !== 'authenticated')
          .map((role: any) => ({
            value: role.type,
            label: this.translateRole(role.type)
          }));

        this.filters.update(filters =>
          filters.map(filter =>
            filter.key === 'role'
              ? { ...filter, options: roleOptions }
              : filter
          )
        );
      },
      error: (err) => console.error('Erreur lors du chargement des rôles:', err)
    });
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.adminService.getUserStats()
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

  private translateRole(roleType: string): string {
    const key = `users-list.roles.${roleType}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : roleType;
  }

  onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
      this.loadRoles();
      this.languageChange.update(v => v + 1);
    }, 150);
  }


  private getSortOptions(): SortOption[] {
    return [
      { value: 'username', label: this.translate.instant('users-list.sort.username') },
      { value: 'email', label: this.translate.instant('users-list.sort.email') },
      { value: 'createdAt', label: this.translate.instant('users-list.sort.createdAt') }
    ];
  }

  private getBlockedOptions(): { value: string; label: string }[] {
    return [
      { value: 'false', label: this.translate.instant('users-list.filters.active') },
      { value: 'true', label: this.translate.instant('users-list.filters.blocked') }
    ];
  }


  private getConfirmedOptions(): { value: string; label: string }[] {
    return [
      { value: 'true', label: this.translate.instant('users-list.filters.confirmed') },
      { value: 'false', label: this.translate.instant('users-list.filters.notConfirmed') }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.users-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.users-list.team')
      },
      {
        label: this.translate.instant('breadcrumbs.users-list.users'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.team.users'));
  }

  private buildUserFilters(search: string, filterValues: FilterValue): UserFilters {
    const userFilters: UserFilters = {};

    if (search) {
      userFilters.search = search;
    }

    if (filterValues['role']) {
      userFilters.role = filterValues['role'];
    }

    if (filterValues['blocked'] !== undefined && filterValues['blocked'] !== '') {
      userFilters.blocked = filterValues['blocked'] === 'true';
    }

    if (filterValues['confirmed'] !== undefined && filterValues['confirmed'] !== '') {
      userFilters.confirmed = filterValues['confirmed'] === 'true';
    }

    return userFilters;
  }

  private loadUsers(
    page: number,
    pageSize: number,
    filters: UserFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {

    this.adminService.getUsers(page, pageSize, filters, sortField, sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const currentUserId = this.currentUserId();
          const filteredUsers = response.data.filter(user => user.documentId !== currentUserId);

          this.listManager.setData(
            filteredUsers,
            response.meta.pagination.total - (response.data.length - filteredUsers.length),
            response.meta.pagination.pageCount
          );
        },
        error: () => {
          this.listManager.setError();
        }
      });
  }

  onActionClick(event: { action: ListAction<UserListItem>; row: UserListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(row: UserListItem): void {
    this.viewUser(row);
  }

  viewUser(user: UserListItem): void {
    this.router.navigate(['/admin/team/users', user.documentId]);
  }

  // Mise à jour de blockUser pour utiliser listManager.reload()
  blockUser(user: UserListItem): void {
    const username = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;

    const message = this.translate.instant('users-list.confirmBlock', { name: username });

    this.confirmDialog.open({
      title: this.translate.instant('users-list.blockTitle'),
      message: message,
      confirmText: this.translate.instant('users-list.block'),
      confirmClass: 'btn-danger',
      icon: 'lock',
      iconClass: 'text-danger'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.blockUser(user.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('users-list.toast.block_success', { name: username })
              );

              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('users-list.toast.block_error', { name: username })
              );
            }
          });
      }
    });
  }

  unblockUser(user: UserListItem): void {
    const username = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;

    this.confirmDialog.open({
      title: this.translate.instant('users-list.unblockTitle'),
      message: this.translate.instant('users-list.confirmUnblock', { name: username }),
      confirmText: this.translate.instant('users-list.unblock'),
      confirmClass: 'btn-success',
      icon: 'lock_open',
      iconClass: 'text-success'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.unblockUser(user.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('users-list.toast.unblock_success', { name: username })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('users-list.toast.unblock_error', { name: username })
              );
            }
          });
      }
    });
  }
}
