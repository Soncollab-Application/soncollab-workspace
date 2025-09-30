import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormModalComponent } from 'shared-lib';
import {CommonModule} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';

import {
  DataTableComponent,
  FilterBarComponent,
  EmptyStateComponent,
  KpiCardComponent,
  StatusBadgeComponent,
  TruncatePipe,
  RelativeDatePipe,
  ConfirmDialogService,
  ToastService,
  TableColumn,
  TableAction,
  FilterConfig,
  KpiData,
  StatusConfig,
  PaginationState,
  SortConfig
} from 'shared-lib';

interface TestUser {
  documentId: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

@Component({
  selector: 'app-test-components',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DataTableComponent,
    FilterBarComponent,
    EmptyStateComponent,
    KpiCardComponent,
    StatusBadgeComponent,
    TruncatePipe,
    RelativeDatePipe
  ],
  templateUrl: './test-components.html',
  styleUrls: ['./test-components.css']
})
export class TestComponents {
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);

  // Test data for DataTable
  users = signal<TestUser[]>([
    {
      documentId: '1',
      username: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      status: 'active',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      documentId: '2',
      username: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      documentId: '3',
      username: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'User',
      status: 'inactive',
      createdAt: new Date(Date.now() - 604800000).toISOString()
    }
  ]);

  loading = signal(false);
  currentSort = signal<SortConfig | null>(null);

  pagination = signal<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    total: 3,
    pageCount: 1
  });

  // Table configuration
  columns: TableColumn<TestUser>[] = [
    {
      key: 'username',
      label: 'Nom',
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'role',
      label: 'Rôle',
      sortable: true
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'badge',
      render: (row) => row.status === 'active' ? 'bg-success' : 'bg-secondary'
    },
    {
      key: 'createdAt',
      label: 'Créé le',
      type: 'date',
      sortable: true
    }
  ];

  actions: TableAction<TestUser>[] = [
    {
      label: 'Éditer',
      icon: 'pencil',
      class: 'btn-outline-primary',
      handler: (row) => this.editUser(row)
    },
    {
      label: 'Supprimer',
      icon: 'trash',
      class: 'btn-outline-danger',
      handler: (row) => this.deleteUser(row)
    }
  ];

  // Filter configuration
  filterConfigs: FilterConfig[] = [
    {
      key: 'role',
      type: 'select',
      label: 'Rôle',
      placeholder: 'Tous les rôles',
      options: [
        { label: 'Admin', value: 'Admin' },
        { label: 'User', value: 'User' }
      ]
    },
    {
      key: 'status',
      type: 'select',
      label: 'Statut',
      placeholder: 'Tous les statuts',
      options: [
        { label: 'Actif', value: 'active' },
        { label: 'Inactif', value: 'inactive' }
      ]
    }
  ];

  // KPI data
  kpiData = signal<KpiData[]>([
    {
      label: 'Total Utilisateurs',
      value: 3,
      icon: 'people',
      iconClass: 'text-primary',
      bgClass: 'bg-primary bg-opacity-10',
      trend: 12.5,
      trendLabel: 'ce mois'
    },
    {
      label: 'Utilisateurs Actifs',
      value: 2,
      icon: 'check-circle',
      iconClass: 'text-success',
      bgClass: 'bg-success bg-opacity-10',
      trend: 8.3,
      trendLabel: 'cette semaine'
    },
    {
      label: 'Nouveaux',
      value: 1,
      icon: 'person-plus',
      iconClass: 'text-info',
      bgClass: 'bg-info bg-opacity-10',
      trend: -5.2,
      trendLabel: 'aujourd\'hui'
    },
    {
      label: 'En attente',
      value: 0,
      icon: 'clock',
      iconClass: 'text-warning',
      bgClass: 'bg-warning bg-opacity-10'
    }
  ]);

  // Status badge
  statusConfig = signal<StatusConfig>({
    label: 'En ligne',
    status: 'success',
    icon: 'circle-fill'
  });

  // Test data for pipes
  longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
  testDate = new Date(Date.now() - 7200000).toISOString();

  // Empty state
  showEmptyState = signal(false);

  onSort(sort: SortConfig): void {
    this.currentSort.set(sort);
    console.log('Sort:', sort);
    this.toast.showInfo('Tri appliqué');
  }

  onPageChange(page: number): void {
    console.log('Page:', page);
    this.pagination.update(p => ({ ...p, currentPage: page }));
  }

  onRowClick(row: TestUser): void {
    console.log('Row clicked:', row);
    this.toast.showInfo(`Utilisateur sélectionné: ${row.username}`);
  }

  onActionClick(event: { action: TableAction<TestUser>; row: TestUser }): void {
    event.action.handler(event.row);
  }

  onSearchChange(term: string): void {
    console.log('Search:', term);
  }

  onFilterChange(filters: any): void {
    console.log('Filters:', filters);
  }

  onClearFilters(): void {
    console.log('Filters cleared');
    this.toast.showInfo('Filtres réinitialisés');
  }

  async editUser(user: TestUser): Promise<void> {
    const form = this.fb.group({
      username: [user.username, Validators.required],
      email: [user.email, [Validators.required, Validators.email]],
      role: [user.role, Validators.required]
    });

    const modalRef = this.modalService.open(FormModalComponent, {
      centered: true,
      size: 'lg'
    });

    modalRef.componentInstance.config = () => ({
      title: `Éditer ${user.username}`,
      submitText: 'Enregistrer',
      cancelText: 'Annuler'
    });

    modalRef.componentInstance.form = () => form;

    modalRef.componentInstance.submitForm.subscribe(() => {
      if (form.valid) {
        console.log('Form submitted:', form.value);
        this.toast.showSuccess('Utilisateur modifié avec succès');
        modalRef.close();
      }
    });
  }

  async deleteUser(user: TestUser): Promise<void> {
    const confirmed = await this.confirmDialog.confirmDelete(user.username);

    if (confirmed) {
      console.log('Delete user:', user);
      this.users.update(users => users.filter(u => u.documentId !== user.documentId));
      this.toast.showSuccess('Utilisateur supprimé');
    }
  }

  onEmptyStateAction(): void {
    console.log('Empty state action clicked');
    this.showEmptyState.set(false);
    this.toast.showSuccess('Action exécutée');
  }

  toggleEmptyState(): void {
    this.showEmptyState.update(v => !v);
  }

  toggleLoading(): void {
    this.loading.update(v => !v);
  }

  testToasts(): void {
    this.toast.showInfo('Message d\'information');
    setTimeout(() => this.toast.showSuccess('Succès !'), 1000);
    setTimeout(() => this.toast.showWarning('Attention !'), 2000);
    setTimeout(() => this.toast.showError('Erreur !'), 3000);
  }
}
