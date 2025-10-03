import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {GetUsersRequest, UserFilters} from '../../../../../core/models/admin';
import {BackofficeUser} from '../../../../../core/models/auth.model';
import {AdminService} from '../../../../../core/services/admin/admin.service';
import {Router} from '@angular/router';
import { PermissionService } from "shared-lib";
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-users-list',
  imports: [
    FormsModule
  ],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css'
})
export class UsersList implements OnInit {
  private adminService = inject(AdminService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);

  users = signal<BackofficeUser[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  searchTerm = '';
  roleFilter = '';
  statusFilter = '';
  confirmedFilter = '';

  canView = computed(() => this.permissionService.canAccessUserManagement());
  canCreate = computed(() => this.permissionService.canCreateUser());
  canUpdate = computed(() => this.permissionService.canUpdateUser());
  canDelete = computed(() => this.permissionService.canDeleteUser());

  availableRoles = computed(() => {
    const roles = new Set(this.users().map(u => u.role?.name).filter(Boolean));
    return Array.from(roles);
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.error.set(null);

    const request: GetUsersRequest = {
      page: 1,
      pageSize: 100
    };

    this.adminService.getUsers(request).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les utilisateurs');
        this.loading.set(false);
      }
    });
  }

  onSearchChange() {
    if (this.searchTerm.length > 2) {
      this.adminService.searchUsers({
        query: this.searchTerm,
        limit: 50
      }).subscribe({
        next: (response) => {
          this.users.set(response.results);
        }
      });
    } else if (this.searchTerm.length === 0) {
      this.loadUsers();
    }
  }

  onFilterChange() {
    const filters: UserFilters = {};

    if (this.roleFilter) {
      filters.role = this.roleFilter;
    }

    if (this.statusFilter === 'active') {
      filters.blocked = false;
    } else if (this.statusFilter === 'blocked') {
      filters.blocked = true;
    }

    if (this.confirmedFilter) {
      filters.confirmed = this.confirmedFilter === 'true';
    }

    const request: GetUsersRequest = {
      page: 1,
      pageSize: 100,
      filters
    };

    this.adminService.getUsers(request).subscribe({
      next: (users) => {
        this.users.set(users);
      }
    });
  }

  getFullName(user: BackofficeUser): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return '-';
  }

  viewUser(user: BackofficeUser) {
    this.router.navigate(['/team/users', user.documentId]);
  }

  editUser(user: BackofficeUser) {
    this.router.navigate(['/team/users', user.documentId, 'edit']);
  }

  toggleBlockUser(user: BackofficeUser) {
    const action = user.blocked ? 'débloquer' : 'bloquer';
    if (!confirm(`Voulez-vous ${action} ${user.username} ?`)) return;

    const observable = user.blocked
      ? this.adminService.unblockUser(user.documentId)
      : this.adminService.blockUser(user.documentId);

    observable.subscribe({
      next: () => {
        this.loadUsers();
      },
      error: () => {
        alert(`Erreur lors du ${action}age`);
      }
    });
  }

  deleteUser(user: BackofficeUser) {
    if (!confirm(`Supprimer définitivement ${user.username} ?`)) return;

    this.adminService.deleteUser(user.documentId).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.documentId !== user.documentId));
      },
      error: () => {
        alert('Erreur lors de la suppression');
      }
    });
  }

  createUser() {
    this.router.navigate(['/team/users/create']);
  }
}
