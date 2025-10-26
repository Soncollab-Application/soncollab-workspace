import {Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import { UserFilters, UserListItem } from '../../../../../core/models/admin/user-list.model';
import { AdminService } from '../../../../../core/services/admin/admin.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  FilterConfig,
  FilterValue,
  SortConfig,
  SortOption,
  FilterBarComponent,
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationState,
  PermissionService,
  LanguageOrchestratorService,
  ConfirmDialogService,
  UrlStateService,
  ToastService,
  KpiData,
  KpiCardComponent
} from 'shared-lib';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {environment} from '../../../../../../environments/environment';
import {initializeFromUrl} from '../../../../../core/utils/url-state.utils';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FilterBarComponent, DataTableComponent, Breadcrumb, TranslatePipe, KpiCardComponent],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css'
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
  private urlState = inject(UrlStateService);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();
  private componentId = 'users-list';

  currentTitle = this.pageTitleService.currentTitle;

  users = signal<UserListItem[]>([]);
  loading = signal(false);
  selectedCount = signal(0);

  currentPage = signal(1);
  pageSize = signal(10);
  totalUsers = signal(0);
  pageCount = signal(0);

  searchTerm = signal('');
  filterValues = signal<FilterValue>({});
  currentSort = signal<SortConfig>({ field: 'username', direction: 'asc' });
  private urlInitialized = signal(false);

  pagination = computed<PaginationState>(() => ({
    currentPage: this.currentPage(),
    pageSize: this.pageSize(),
    total: this.totalUsers(),
    pageCount: this.pageCount()
  }));

  canFindUsers = computed(() =>
    this.permissionsService.canFindUsers()
  );

  canManageUsers = computed(() =>
    this.permissionsService.canUpdateUser()
  );

  canCreateUser = computed(() =>
    this.permissionsService.canCreateUser()
  );

  canManageRoles = computed(() =>
    this.permissionsService.canManageRoles()
  );

  currentUserId = computed(() => this.authService.currentUser?.documentId);

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<TableColumn<UserListItem>[]>([]);
  actions = signal<TableAction<UserListItem>[]>([]);

  stats = signal<any>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const size = this.pageSize();
      const search = this.searchTerm();
      const filters = this.filterValues();
      const sort = this.currentSort();

      if (!this.urlInitialized()) return;

      untracked(() => {
        const userFilters = this.buildUserFilters(search, filters);
        this.loadUsers(page, size, userFilters, sort.field, sort.direction);
      });
    });
  }

  ngOnInit() {
    this.setBreadcrumbs();
    initializeFromUrl(
      this.route,
      this.urlState,
      this.searchTerm,
      this.filterValues,
      this.currentSort,
      this.currentPage
    );
    this.initializeConfig();
    this.loadRoles();
    this.loadStats();
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
    this.urlInitialized.set(true);
  }


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


  private initializeConfig(): void {
    // Plus d'option vide, uniquement le placeholder
    this.filters.set([
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('users-list.filters.role'),
        placeholder: this.translate.instant('users-list.filters.allRoles'),
        options: [] // Sera rempli par loadRoles()
      },
      {
        key: 'blocked',
        type: 'select',
        label: this.translate.instant('users-list.filters.state'),
        placeholder: this.translate.instant('users-list.filters.allStates'),
        options: [
          { value: 'false', label: this.translate.instant('users-list.filters.active') },
          { value: 'true', label: this.translate.instant('users-list.filters.blocked') }
        ]
      },
      {
        key: 'confirmed',
        type: 'select',
        label: this.translate.instant('users-list.filters.confirmation'),
        placeholder: this.translate.instant('users-list.filters.allStates'),
        options: [
          { value: 'true', label: this.translate.instant('users-list.filters.confirmed') },
          { value: 'false', label: this.translate.instant('users-list.filters.notConfirmed') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'username', label: this.translate.instant('users-list.sort.username') },
      { value: 'email', label: this.translate.instant('users-list.sort.email') },
      { value: 'createdAt', label: this.translate.instant('users-list.sort.createdAt') }
    ]);

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

        // Mettre à jour uniquement les options sans ajouter d'option vide
        this.filters.update(filters =>
          filters.map(filter =>
            filter.key === 'role'
              ? {
                ...filter,
                options: roleOptions
              }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
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
    this.loading.set(true);

    this.adminService.getUsers(page, pageSize, filters, sortField, sortDirection).subscribe({
      next: (response) => {
        const currentUserId = this.currentUserId();
        const filteredUsers = response.data.filter(user => user.documentId !== currentUserId);

        this.users.set(filteredUsers);
        this.totalUsers.set(response.meta.pagination.total - (response.data.length - filteredUsers.length));
        this.pageCount.set(response.meta.pagination.pageCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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

  onActionClick(event: { action: TableAction<UserListItem>; row: UserListItem }): void {
    event.action.handler(event.row);
  }

  onRowClick(row: UserListItem): void {
    this.viewUser(row);
  }

  viewUser(user: UserListItem): void {
    this.router.navigate(['/admin/team/users', user.documentId]);
  }

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
              const sort = this.currentSort();
              this.loadUsers(
                this.currentPage(),
                this.pageSize(),
                this.buildUserFilters(this.searchTerm(), this.filterValues()),
                sort.field,
                sort.direction
              );
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
              const sort = this.currentSort();
              this.loadUsers(
                this.currentPage(),
                this.pageSize(),
                this.buildUserFilters(this.searchTerm(), this.filterValues()),
                sort.field,
                sort.direction
              );
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
