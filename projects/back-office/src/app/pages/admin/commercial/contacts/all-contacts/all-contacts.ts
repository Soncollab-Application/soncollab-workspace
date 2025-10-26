import { Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SalesContact,
  ContactFilters,
  ContactStats,
  SalesContactStatus,
  ContactType,
  UrgencyLevel
} from '../../../../../core/models/sales/sales-contact.model';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
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
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import {  TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { initializeFromUrl } from '../../../../../core/utils/url-state.utils';
import {ContactModalService} from '../../../../../core/services/admin/contact-modal.service';
import {QualifyContactModal} from '../../../../../core/components/admin/qualify-contact-modal/qualify-contact-modal';
import {AssignContactModal} from '../../../../../core/components/admin/assign-contact-modal/assign-contact-modal';

@Component({
  selector: 'app-all-contacts',
  standalone: true,
  imports: [FilterBarComponent, DataTableComponent, Breadcrumb, KpiCardComponent, AssignContactModal, QualifyContactModal],
  templateUrl: './all-contacts.html',
  styleUrl: './all-contacts.css'
})
export class AllContacts implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
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
  private contactModalService = inject(ContactModalService);


  private destroy$ = new Subject<void>();
  private componentId = 'all-contacts';

  currentTitle = this.pageTitleService.currentTitle;

  contacts = signal<SalesContact[]>([]);
  loading = signal(false);
  selectedCount = signal(0);

  currentPage = signal(1);
  pageSize = signal(25);
  totalContacts = signal(0);
  pageCount = signal(0);

  searchTerm = signal('');
  filterValues = signal<FilterValue>({});
  currentSort = signal<SortConfig>({ field: 'createdAt', direction: 'desc' });
  private urlInitialized = signal(false);

  pagination = computed<PaginationState>(() => ({
    currentPage: this.currentPage(),
    pageSize: this.pageSize(),
    total: this.totalContacts(),
    pageCount: this.pageCount()
  }));

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

  emptyTitle = signal('');
  emptyMessage = signal('');

  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<TableColumn<SalesContact>[]>([]);
  actions = signal<TableAction<SalesContact>[]>([]);

  stats = signal<ContactStats | null>(null);
  loadingStats = signal(false);
  private languageChange = signal(0);

  kpiCards = computed<KpiData[]>(() => {
    const statsData = this.stats();
    this.languageChange();

    if (!statsData) return [];

    // Calculer les totaux depuis pipeline
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

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const size = this.pageSize();
      const search = this.searchTerm();
      const filters = this.filterValues();
      const sort = this.currentSort();

      if (!this.urlInitialized()) return;

      untracked(() => {
        this.urlState.syncToUrl({
          page: page,
          search: search,
          filters: filters,
          sort: sort
        });

        this.loadContacts(
          page,
          size,
          this.buildContactFilters(search, filters),
          sort.field,
          sort.direction
        );
      });
    });
  }

  ngOnInit(): void {
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );

    initializeFromUrl(
      this.route,
      this.urlState,
      this.searchTerm,
      this.filterValues,
      this.currentSort,
      this.currentPage
    );

    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.loadStats();

    this.urlInitialized.set(true);
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
        options: [
          { value: 'true', label: this.translate.instant('contacts-list.filters.assigned') },
          { value: 'false', label: this.translate.instant('contacts-list.filters.unassigned') }
        ]
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt', label: this.translate.instant('contacts-list.sort.createdAt') },
      { value: 'updatedAt', label: this.translate.instant('contacts-list.sort.updatedAt') },
      { value: 'lead_score', label: this.translate.instant('contacts-list.sort.leadScore') },
      { value: 'company_name', label: this.translate.instant('contacts-list.sort.company') },
      { value: 'first_name', label: this.translate.instant('contacts-list.sort.name') }
    ]);

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
        render: (contact) => `${contact.lead_score}/100`,
        colspan: 2
      }
    ]);

    this.actions.set([
      {
        label: this.translate.instant('contacts-list.actions.view'),
        icon: 'visibility',
        handler: (contact) => this.viewContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.assign'),
        icon: 'person_add',
        condition: (contact) => this.canAssignContacts() && !contact.assigned_to,
        handler: (contact) => this.assignContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.reassign'),
        icon: 'swap_horiz',
        condition: (contact) => this.canAssignContacts() && !!contact.assigned_to,
        handler: (contact) => this.reassignContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.qualify'),
        icon: 'verified',
        condition: (contact) => this.canQualifyContacts() && ['new', 'contacted', 'interested'].includes(contact.sales_contact_status),
        handler: (contact) => this.qualifyContact(contact)
      },
      {
        label: this.translate.instant('contacts-list.actions.delete'),
        icon: 'delete',
        condition: () => this.canDeleteContacts(),
        handler: (contact) => this.deleteContact(contact)
      }
    ]);

    this.emptyTitle.set(this.translate.instant('contacts-list.no_contacts'));
    this.emptyMessage.set(this.translate.instant('contacts-list.no_contacts_message'));
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

  private getStatusOptions(): Array<{ value: string; label: string }> {
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

  private getContactTypeOptions(): Array<{ value: string; label: string }> {
    const types: ContactType[] = ['label', 'distributor', 'artist', 'manager', 'publisher', 'pricing_inquiry', 'other'];

    return types.map(type => ({
      value: type,
      label: this.translate.instant(`contacts-list.types.${type}`)
    }));
  }

  private getUrgencyOptions(): Array<{ value: string; label: string }> {
    const urgencies: UrgencyLevel[] = ['low', 'normal', 'high', 'urgent'];

    return urgencies.map(urgency => ({
      value: urgency,
      label: this.translate.instant(`contacts-list.urgencies.${urgency}`)
    }));
  }

  private getStatusClass(status: SalesContactStatus): string {
    const classes: Record<SalesContactStatus, string> = {
      new: 'text-info bg-info-subtle',
      contacted: 'text-primary bg-primary-subtle',
      qualified: 'text-success bg-success-subtle',
      interested: 'text-warning bg-warning-subtle',
      demo_scheduled: 'text-info bg-info-subtle',
      demo_completed: 'text-primary bg-primary-subtle',
      proposal_sent: 'text-warning bg-warning-subtle',
      negotiation: 'text-warning bg-warning-subtle',
      converted: 'text-success bg-success-subtle',
      lost: 'text-danger bg-danger-subtle'
    };
    return classes[status] || 'text-secondary bg-secondary-subtle';
  }

  private getUrgencyClass(urgency: UrgencyLevel): string {
    const classes: Record<UrgencyLevel, string> = {
      low: 'text-secondary bg-secondary-subtle',
      normal: 'text-info bg-info-subtle',
      high: 'text-warning bg-warning-subtle',
      urgent: 'text-danger bg-danger-subtle'
    };
    return classes[urgency] || 'text-secondary bg-secondary-subtle';
  }

  onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
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
    this.loading.set(true);

    this.adminSalesService.getContacts(page, pageSize, filters, sortField, sortDirection).subscribe({
      next: (response) => {
        this.contacts.set(response.data);
        this.totalContacts.set(response.meta.pagination.total);
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

  onActionClick(event: { action: TableAction<SalesContact>; row: SalesContact }): void {
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
      this.loadContacts(
        this.currentPage(),
        this.pageSize(),
        this.buildContactFilters(this.searchTerm(), this.filterValues()),
        this.currentSort().field,
        this.currentSort().direction
      );
      this.loadStats();
    });
  }

  reassignContact(contact: SalesContact): void {
    this.contactModalService.openReassign(contact, () => {
      this.loadContacts(
        this.currentPage(),
        this.pageSize(),
        this.buildContactFilters(this.searchTerm(), this.filterValues()),
        this.currentSort().field,
        this.currentSort().direction
      );
      this.loadStats();
    });
  }

  qualifyContact(contact: SalesContact): void {
    this.contactModalService.openQualify(contact, () => {
      this.loadContacts(
        this.currentPage(),
        this.pageSize(),
        this.buildContactFilters(this.searchTerm(), this.filterValues()),
        this.currentSort().field,
        this.currentSort().direction
      );
      this.loadStats();
    });
  }

  deleteContact(contact: SalesContact): void {
    const name = `${contact.first_name} ${contact.last_name}`;
    const message = this.translate.instant('contacts-list.confirmDelete', { name });

    this.confirmDialog.open({
      title: this.translate.instant('contacts-list.deleteTitle'),
      message: message,
      confirmText: this.translate.instant('contacts-list.delete'),
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminSalesService.deleteContact(contact.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('contacts-list.toast.delete_success', { name })
              );
              const sort = this.currentSort();
              this.loadContacts(
                this.currentPage(),
                this.pageSize(),
                this.buildContactFilters(this.searchTerm(), this.filterValues()),
                sort.field,
                sort.direction
              );
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
}
