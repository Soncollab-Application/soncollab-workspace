import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  SalesContact,
  ContactFilters,
  ContactStats,
  SalesContactStatus,
  ContactType,
  UrgencyLevel
} from '../../../../../core/models/sales/sales-contact.model';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
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
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ContactModalService } from '../../../../../core/services/admin/modals/contact-modal.service';
import { QualifyContactModal } from '../../../../../core/components/admin/modals/qualify-contact-modal/qualify-contact-modal';
import { AssignContactModal } from '../../../../../core/components/admin/modals/assign-contact-modal/assign-contact-modal';

@Component({
  selector: 'app-all-contacts',
  standalone: true,
  imports: [FilterBarComponent, Breadcrumb, KpiCardComponent, AssignContactModal, QualifyContactModal, DataList],
  templateUrl: './all-contacts.html',
  styleUrl: './all-contacts.css',
  providers: [ListStateManager]
})
export class AllContacts implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
  protected router = inject(Router);
  private permissionsService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private contactModalService = inject(ContactModalService);

  protected listManager = inject(ListStateManager<SalesContact, ContactFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'all-contacts';

  currentTitle = this.pageTitleService.currentTitle;

  canFindContacts = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'find')
  );

  canManageContacts = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'update')
  );

  canDeleteContacts = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'delete')
  );

  canAssignContacts = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'assign')
  );

  canQualifyContacts = computed(() =>
    this.permissionsService.hasPermission('sales-contact', 'sales-contact', 'qualify')
  );

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<SalesContact>[]>([]);
  actions = signal<ListAction<SalesContact>[]>([]);

  emptyTitle = signal('');
  emptyMessage = signal('');

  stats = signal<ContactStats | null>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    const newContacts = statsData.pipeline?.["new"] || 0;
    const qualifiedContacts = statsData.pipeline?.["qualified"] || 0;
    const conversionRate = parseFloat(statsData.conversion_rate || '0');

    return [
      {
        label: this.translate.instant('contacts-list.kpi.total'),
        value: (statsData.total_contacts || 0).toString(),
        icon: 'contacts',
        iconClass: 'text-primary',
        bgClass: 'bg-primary bg-opacity-10'
      },
      {
        label: this.translate.instant('contacts-list.kpi.new'),
        value: newContacts.toString(),
        icon: 'new_releases',
        iconClass: 'text-info',
        bgClass: 'bg-info bg-opacity-10'
      },
      {
        label: this.translate.instant('contacts-list.kpi.qualified'),
        value: qualifiedContacts.toString(),
        icon: 'check_circle',
        iconClass: 'text-success',
        bgClass: 'bg-success bg-opacity-10'
      },
      {
        label: this.translate.instant('contacts-list.kpi.conversion_rate'),
        value: `${conversionRate.toFixed(1)}%`,
        icon: 'trending_up',
        iconClass: 'text-warning',
        bgClass: 'bg-warning bg-opacity-10'
      },
      {
        label: this.translate.instant('contacts-list.kpi.unassigned'),
        value: (statsData.assignment?.unassigned_contacts || 0).toString(),
        icon: 'help_outline',
        iconClass: 'text-danger',
        bgClass: 'bg-danger bg-opacity-10'
      }
    ];
  });

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.loadStats();

    const defaultSort: SortConfig = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'desc' }
      : { field: 'createdAt', direction: 'desc' };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 25,
      onLanguageChange: () => this.onLanguageChange()
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildContactFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadContacts(page, pageSize, filters, sortField, sortDirection),
      this.canFindContacts
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('contacts-list.filters.status'),
        placeholder: this.translate.instant('contacts-list.filters.allStatuses'),
        options: this.getStatusOptions()
      },
      {
        key: 'contact_type',
        type: 'select',
        label: this.translate.instant('contacts-list.filters.type'),
        placeholder: this.translate.instant('contacts-list.filters.allTypes'),
        options: this.getContactTypeOptions()
      },
      {
        key: 'urgency',
        type: 'select',
        label: this.translate.instant('contacts-list.filters.urgency'),
        placeholder: this.translate.instant('contacts-list.filters.allUrgencies'),
        options: this.getUrgencyOptions()
      },
      {
        key: 'assigned',
        type: 'select',
        label: this.translate.instant('contacts-list.filters.assignment'),
        placeholder: this.translate.instant('contacts-list.filters.allAssignments'),
        options: this.getAssignedOptions()
      }
    ]);

    this.sortOptions.set(this.getSortOptions());

    this.columns.set([
      {
        key: 'first_name',
        label: this.translate.instant('contacts-list.columns.contact'),
        sortable: true,
        type: 'user',
        subtitleKey: 'email',
        render: (contact) => {
          return contact.first_name && contact.last_name
            ? `${contact.first_name} ${contact.last_name}`
            : contact.email;
        }
      },
      {
        key: 'company_name',
        label: this.translate.instant('contacts-list.columns.company'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'contact_type',
        label: this.translate.instant('contacts-list.columns.type'),
        type: 'custom-badge',
        sortable: true,
        render: (contact) => this.translate.instant(`contacts-list.types.${contact.contact_type}`),
        cellClass: () => 'text-primary bg-primary-subtle'
      },
      {
        key: 'sales_contact_status',
        label: this.translate.instant('contacts-list.columns.status'),
        type: 'custom-badge',
        sortable: true,
        render: (contact) => this.translate.instant(`contacts-list.statuses.${contact.sales_contact_status}`),
        cellClass: (contact) => this.getStatusClass(contact.sales_contact_status)
      },
      {
        key: 'urgency_level',
        label: this.translate.instant('contacts-list.columns.urgency'),
        type: 'custom-badge',
        render: (contact) => this.translate.instant(`contacts-list.urgencies.${contact.urgency_level}`),
        cellClass: (contact) => this.getUrgencyClass(contact.urgency_level)
      },
      {
        key: 'assigned_to',
        label: this.translate.instant('contacts-list.columns.assigned_to'),
        type: 'text',
        render: (contact) => contact.assigned_to
          ? `${contact.assigned_to.first_name} ${contact.assigned_to.last_name}`
          : this.translate.instant('contacts-list.unassigned')
      },
      {
        key: 'lead_score',
        label: this.translate.instant('contacts-list.columns.lead_score'),
        sortable: true,
        type: 'text',
        colspan: 2
      }
    ]);

    this.actions.set([
      {
        label: this.translate.instant('contacts-list.actions.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (contact) => this.viewContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.assign'),
        icon: 'person_add',
        class: 'btn-outline-primary',
        condition: (contact) => this.canAssignContacts() && !contact.assigned_to,
        handler: (contact) => this.assignContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.reassign'),
        icon: 'swap_horiz',
        class: 'btn-outline-info',
        condition: (contact) => this.canAssignContacts() && !!contact.assigned_to,
        handler: (contact) => this.reassignContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.qualify'),
        icon: 'verified',
        class: 'btn-outline-success',
        condition: (contact) => this.canQualifyContacts() && ['new', 'contacted', 'interested'].includes(contact.sales_contact_status),
        handler: (contact) => this.qualifyContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.delete'),
        icon: 'delete',
        class: 'btn-outline-danger',
        condition: () => this.canDeleteContacts(),
        handler: (contact) => this.deleteContact(contact)
      }
    ]);

    this.emptyTitle.set(this.translate.instant('contacts-list.no_contacts'));
    this.emptyMessage.set(this.translate.instant('contacts-list.no_contacts_message'));
  }

  // Méthodes helpers pour les options
  private getStatusOptions(): Array<{ value: SalesContactStatus; label: string }> {
    const statuses: SalesContactStatus[] = [
      'new', 'contacted', 'qualified', 'interested',
      'demo_scheduled', 'demo_completed', 'proposal_sent',
      'negotiation', 'converted', 'lost'
    ];
    return statuses.map(status => ({
      value: status,
      label: this.translate.instant(`contacts-list.statuses.${status}`)
    }));
  }

  private getContactTypeOptions(): Array<{ value: ContactType; label: string }> {
    const types: ContactType[] = ['label', 'artist', 'manager', 'distributor', 'publisher', 'other'];
    return types.map(type => ({
      value: type,
      label: this.translate.instant(`contacts-list.types.${type}`)
    }));
  }

  private getUrgencyOptions(): Array<{ value: UrgencyLevel; label: string }> {
    const urgencies: UrgencyLevel[] = ['low', 'normal', 'high', 'urgent'];
    return urgencies.map(urgency => ({
      value: urgency,
      label: this.translate.instant(`contacts-list.urgencies.${urgency}`)
    }));
  }

  private getAssignedOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'true', label: this.translate.instant('contacts-list.filters.assigned') },
      { value: 'false', label: this.translate.instant('contacts-list.filters.unassigned') }
    ];
  }

  private getSortOptions(): SortOption[] {
    return [
      { value: 'createdAt', label: this.translate.instant('contacts-list.sort.createdAt') },
      { value: 'updatedAt', label: this.translate.instant('contacts-list.sort.updatedAt') },
      { value: 'lead_score', label: this.translate.instant('contacts-list.sort.leadScore') },
      { value: 'company_name', label: this.translate.instant('contacts-list.sort.company') },
      { value: 'first_name', label: this.translate.instant('contacts-list.sort.name') }
    ];
  }

  private buildContactFilters(search: string, filterValues: FilterValue): ContactFilters {
    const contactFilters: ContactFilters = {};

    if (search) {
      contactFilters.search = search;
    }

    if (filterValues['status']) {
      contactFilters.status = filterValues['status'] as SalesContactStatus;
    }

    if (filterValues['contact_type']) {
      contactFilters.contact_type = filterValues['contact_type'] as ContactType;
    }

    if (filterValues['urgency']) {
      contactFilters.urgency = filterValues['urgency'] as UrgencyLevel;
    }

    if (filterValues['assigned'] !== undefined && filterValues['assigned'] !== '') {
      contactFilters.assigned = filterValues['assigned'] === 'true';
    }

    return contactFilters;
  }

  private loadContacts(
    page: number,
    pageSize: number,
    filters: ContactFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.adminSalesService.getContacts(page, pageSize, filters, sortField, sortDirection)
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
          console.error('Error loading contacts:', err);
          this.listManager.setError();
        }
      });
  }

  private loadStats(): void {
    this.loadingStats.set(true);
    this.adminSalesService.getContactStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.loadingStats.set(false);
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.stats.set({
            pipeline: {},
            assignment: {
              total_contacts: 0,
              assigned_contacts: 0,
              unassigned_contacts: 0,
              assignment_rate: '0',
              contacts_by_rep: {}
            },
            total_contacts: 0,
            converted_contacts: 0,
            conversion_rate: '0',
            contacts_by_type: {}
          });
          this.loadingStats.set(false);
        }
      });
  }

  onActionClick(event: { action: ListAction<SalesContact>; row: SalesContact }): void {
    event.action.handler(event.row);
  }

  onRowClick(row: SalesContact): void {
    this.viewContact(row);
  }

  viewContact(contact: SalesContact): void {
    this.router.navigate(['/admin/commercial/contacts', contact.documentId]);
  }

  assignContact(contact: SalesContact): void {
    this.contactModalService.openAssign(contact, () => {
      this.listManager.reload();
      this.loadStats();
    });
  }

  reassignContact(contact: SalesContact): void {
    this.contactModalService.openReassign(contact, () => {
      this.listManager.reload();
      this.loadStats();
    });
  }

  qualifyContact(contact: SalesContact): void {
    this.contactModalService.openQualify(contact, () => {
      this.listManager.reload();
      this.loadStats();
    });
  }

  deleteContact(contact: SalesContact): void {
    const name = `${contact.first_name} ${contact.last_name}`;

    this.confirmDialog.confirmDelete(name).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.deleteContact(contact.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('contacts-list.toast.delete_success', { name })
              );
              this.listManager.reload();
              this.loadStats();
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('contacts-list.toast.delete_error', { name })
              );
            }
          });
      }
    });
  }

  private getStatusClass(status: SalesContactStatus): string {
    const classes: Record<SalesContactStatus, string> = {
      new: 'bg-info-subtle text-info',
      contacted: 'bg-primary-subtle text-primary',
      qualified: 'bg-success-subtle text-success',
      interested: 'bg-warning-subtle text-warning',
      demo_scheduled: 'bg-info-subtle text-info',
      demo_completed: 'bg-primary-subtle text-primary',
      proposal_sent: 'bg-warning-subtle text-warning',
      negotiation: 'bg-info-subtle text-info',
      converted: 'bg-success-subtle text-success',
      lost: 'bg-danger-subtle text-danger'
    };
    return classes[status] || 'bg-secondary-subtle text-secondary';
  }

  private getUrgencyClass(urgency: UrgencyLevel): string {
    const classes: Record<UrgencyLevel, string> = {
      low: 'bg-secondary-subtle text-secondary',
      normal: 'bg-info-subtle text-info',
      high: 'bg-warning-subtle text-warning',
      urgent: 'bg-danger-subtle text-danger'
    };
    return classes[urgency] || 'bg-secondary-subtle text-secondary';
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
        label: this.translate.instant('breadcrumbs.contacts-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.contacts-list.commercial')
      },
      {
        label: this.translate.instant('breadcrumbs.contacts-list.all_contacts'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.commercial.contacts'));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.listManager.destroy();
    this.pageTitleService.resetBreadcrumbs();
  }
}
