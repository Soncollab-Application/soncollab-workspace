import {Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from '@angular/core';
import { Router } from '@angular/router';
import { UserFilters, UserListItem } from '../../../../../core/models/admin/user-list.model';
import { AdminService } from '../../../../../core/services/admin/admin.service';
import {
  FilterConfig,
  FilterBarComponent,
  DataTableComponent,
  TableColumn,
  TableAction,
  PaginationState,
  PermissionService,
  LanguageService,
  LanguageOrchestratorService
} from 'shared-lib';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-users-list',
  imports: [
    FilterBarComponent,
    DataTableComponent,
    Breadcrumb
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css'
})
export class UsersList implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);
  private languageOrchestrator=  inject(LanguageOrchestratorService);

  private destroy$ = new Subject<void>();

  private componentId = 'users-list';

  currentTitle = this.pageTitleService.currentTitle;
  breadcrumbs = this.pageTitleService.breadcrumbs;

  users = signal<UserListItem[]>([]);
  loading = signal(false);
  filters = signal<UserFilters>({});

  currentPage = signal(1);
  pageSize = signal(10);

  // Ces valeurs viennent de la réponse API (ne déclenchent PAS l'effect)
  totalUsers = signal(0);
  pageCount = signal(0);

  // Computed pour l'affichage (ne déclenche pas l'effect)
  pagination = computed<PaginationState>(() => ({
    currentPage: this.currentPage(),
    pageSize: this.pageSize(),
    total: this.totalUsers(),
    pageCount: this.pageCount()
  }));

  canManageUsers = computed(() =>
    this.permissionsService.hasPermission('users-permissions', 'user', 'find')
  );

  filterConfigs: FilterConfig[] = [
    {
      key: 'role',
      type: 'select',
      label: 'Rôle',
      placeholder: 'Tous les rôles',
      options: [
        { value: 'soncollab_admin', label: 'Admin' },
        { value: 'soncollab_sales', label: 'Commercial' },
        { value: 'soncollab_content', label: 'Content Manager' }
      ]
    },
    {
      key: 'status',
      type: 'select',
      label: 'Statut',
      placeholder: 'Tous les statuts',
      options: [
        { value: 'available', label: 'Disponible' },
        { value: 'busy', label: 'Occupé' },
        { value: 'offline', label: 'Hors ligne' }
      ]
    },
    {
      key: 'blocked',
      type: 'boolean',
      label: 'Bloqué'
    }
  ];

  columns: TableColumn<UserListItem>[] = [
    {
      key: 'avatar',
      label: '',
      type: 'image',
      width: '48px'
    },
    {
      key: 'full_name',
      label: 'Utilisateur',
      sortable: true,
      render: (user) => `${user.first_name} ${user.last_name}`
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (user) => user.role.name
    },
    {
      key: 'availability_status',
      label: 'Statut',
      type: 'badge',
      render: (user) => this.formatStatus(user.availability_status),
      cellClass: (user) => this.getStatusClass(user.availability_status)
    },
    {
      key: 'sales_quotas',
      label: 'Quota',
      render: (user) => {
        const activeQuota = user.sales_quotas?.find(q => q.is_active);
        return activeQuota
          ? `${activeQuota.current_contacts}/${activeQuota.max_contacts}`
          : '-';
      }
    },
    {
      key: 'blocked',
      label: 'État',
      type: 'badge',
      render: (user) => user.blocked ? 'Bloqué' : 'Actif',
      cellClass: (user) => user.blocked ? 'text-danger' : 'text-success'
    }
  ];

  actions: TableAction<UserListItem>[] = [
    {
      label: 'Voir',
      icon: 'eye',
      class: 'btn-outline-primary',
      handler: (user) => this.viewUser(user)
    },
    {
      label: 'Modifier',
      icon: 'pencil',
      class: 'btn-outline-secondary',
      condition: () => this.canManageUsers(),
      handler: (user) => this.editUser(user)
    },
    {
      label: 'Bloquer',
      icon: 'lock',
      class: 'btn-outline-danger',
      condition: (user) => this.canManageUsers() && !user.blocked,
      handler: (user) => this.blockUser(user)
    },
    {
      label: 'Débloquer',
      icon: 'unlock',
      class: 'btn-outline-success',
      condition: (user) => this.canManageUsers() && user.blocked,
      handler: (user) => this.unblockUser(user)
    }
  ];

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const size = this.pageSize();
      const currentFilters = this.filters();
      untracked(() => {
        this.loadUsers(page, size, currentFilters);
      });
    });
  }

  ngOnInit() {
    this.setBreadcrumbs();
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
  }

  onLanguageChange(): void {
    this.setBreadcrumbs();
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
        label: this.translate.instant('breadcrumbs.users-list.team'),
      },
      {
        label: this.translate.instant('breadcrumbs.users-list.users'),
        active: true
      }
    ]);
  }

  private loadUsers(page: number, pageSize: number, filters: UserFilters): void {
    this.loading.set(true);

    this.adminService.getUsers(page, pageSize, filters).subscribe({
      next: (response) => {
        this.users.set(response.data);

        this.totalUsers.set(response.meta.pagination.total);
        this.pageCount.set(response.meta.pagination.pageCount);

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(search: string): void {
    this.filters.update(f => ({ ...f, search }));
    this.currentPage.set(1);
  }

  onFilterChange(filterValues: any): void {
    this.filters.set(filterValues);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onActionClick(event: { action: TableAction<UserListItem>; row: UserListItem }): void {
    event.action.handler(event.row);
  }

  viewUser(user: UserListItem): void {
    this.router.navigate(['/admin/team/users', user.id]);
  }

  editUser(user: UserListItem): void {
    this.router.navigate(['/admin/team/users', user.id, 'edit']);
  }

  blockUser(user: UserListItem): void {
    if (confirm(`Bloquer ${user.first_name} ${user.last_name} ?`)) {
      this.adminService.blockUser(user.id).subscribe(() => {
        // Re-charger en utilisant les valeurs actuelles
        this.loadUsers(this.currentPage(), this.pageSize(), this.filters());
      });
    }
  }

  unblockUser(user: UserListItem): void {
    this.adminService.unblockUser(user.id).subscribe(() => {
      this.loadUsers(this.currentPage(), this.pageSize(), this.filters());
    });
  }

  private formatStatus(status: string): string {
    const labels: Record<string, string> = {
      'available': 'Disponible',
      'busy': 'Occupé',
      'offline': 'Hors ligne'
    };
    return labels[status] || status;
  }

  private getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'available': 'badge bg-success',
      'busy': 'badge bg-warning',
      'offline': 'badge bg-secondary'
    };
    return classes[status] || 'badge bg-secondary';
  }
}
