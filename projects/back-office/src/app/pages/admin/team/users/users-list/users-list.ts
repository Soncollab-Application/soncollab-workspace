import {Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from '@angular/core';
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
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationState,
  PermissionService,
  LanguageOrchestratorService
} from 'shared-lib';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject} from 'rxjs';
import {environment} from '../../../../../../environments/environment';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [FilterBarComponent, DataTableComponent, Breadcrumb, TranslatePipe],
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

  pagination = computed<PaginationState>(() => ({
    currentPage: this.currentPage(),
    pageSize: this.pageSize(),
    total: this.totalUsers(),
    pageCount: this.pageCount()
  }));

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

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<TableColumn<UserListItem>[]>([]);
  actions = signal<TableAction<UserListItem>[]>([]);

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const size = this.pageSize();
      const search = this.searchTerm();
      const filters = this.filterValues();
      const sort = this.currentSort();

      untracked(() => {
        const userFilters = this.buildUserFilters(search, filters);
        this.loadUsers(page, size, userFilters, sort.field, sort.direction);
      });
    });
  }

  ngOnInit() {
    this.setBreadcrumbs();
    this.initializeConfig();
    this.loadRoles();
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'role',
        type: 'select',
        label: this.translate.instant('users-list.filters.role'),
        placeholder: this.translate.instant('users-list.filters.allRoles'),
        options: [
          { value: '', label: this.translate.instant('users-list.filters.allRoles') }
        ]
      },
      {
        key: 'blocked',
        type: 'select',
        label: this.translate.instant('users-list.filters.state'),
        placeholder: this.translate.instant('users-list.filters.allStates'),
        options: [
          { value: '', label: this.translate.instant('users-list.filters.allStates') },
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
          { value: '', label: this.translate.instant('users-list.filters.allStates') },
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
        icon: 'eye',
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
        icon: 'unlock',
        condition: (user) => this.canManageUsers() && user.blocked && user.documentId !== this.currentUserId(),
        handler: (user) => this.unblockUser(user)
      }
    ]);
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
              ? {
                ...filter,
                options: [
                  { value: '', label: this.translate.instant('users-list.filters.allRoles') },
                  ...roleOptions
                ]
              }
              : filter
          )
        );
      },
      error: (err) => console.error('Erreur lors du chargement des rôles:', err)
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
      this.initializeConfig();
      this.loadRoles();
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

    if (confirm(message)) {
      this.adminService.blockUser(user.documentId).subscribe(() => {
        const sort = this.currentSort();
        this.loadUsers(
          this.currentPage(),
          this.pageSize(),
          this.buildUserFilters(this.searchTerm(), this.filterValues()),
          sort.field,
          sort.direction
        );
      });
    }
  }

  unblockUser(user: UserListItem): void {
    this.adminService.unblockUser(user.documentId).subscribe(() => {
      const sort = this.currentSort();
      this.loadUsers(
        this.currentPage(),
        this.pageSize(),
        this.buildUserFilters(this.searchTerm(), this.filterValues()),
        sort.field,
        sort.direction
      );
    });
  }
}
