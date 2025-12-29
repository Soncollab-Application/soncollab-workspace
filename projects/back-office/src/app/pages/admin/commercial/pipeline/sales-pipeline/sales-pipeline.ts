import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ListStateManager,
  FilterConfig,
  SortOption,
  ListColumn,
  ListAction,
  FilterValue,
  ListStateConfig,
  PermissionService,
  ConfirmDialogService,
  ToastService,
  FilterBarComponent,
  DataList
} from 'shared-lib';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { AdminSalesService } from '../../../../../core/services/admin/admin-sales.service';
import {
  SalesContact,
  SalesContactStatus,
  ContactType,
  UrgencyLevel,
  ContactFilters
} from '../../../../../core/models/sales/sales-contact.model';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { ContactModalService } from '../../../../../core/services/admin/modals/contact-modal.service';
import { AssignContactModal } from '../../../../../core/components/admin/modals/assign-contact-modal/assign-contact-modal';
import { QualifyContactModal } from '../../../../../core/components/admin/modals/qualify-contact-modal/qualify-contact-modal';

@Component({
  selector: 'app-sales-pipeline',
  imports: [
    Breadcrumb,
    FilterBarComponent,
    DataList,
    AssignContactModal,
    QualifyContactModal,
    TranslateModule
  ],
  providers: [ListStateManager],
  templateUrl: './sales-pipeline.html',
  styleUrl: './sales-pipeline.css'
})
export class SalesPipeline implements OnInit, OnDestroy {
  private adminSalesService = inject(AdminSalesService);
  private translate = inject(TranslateService);
  protected router = inject(Router);
  private permissionService = inject(PermissionService);
  private pageTitleService = inject(PageTitleService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private contactModalService = inject(ContactModalService);

  protected listManager = inject(ListStateManager<SalesContact, ContactFilters>);

  private destroy$ = new Subject<void>();
  private componentId = 'sales-pipeline-list';

  // Config
  filters = signal<FilterConfig[]>([]);
  sortOptions = signal<SortOption[]>([]);
  columns = signal<ListColumn<SalesContact>[]>([]);
  actions = signal<ListAction<SalesContact>[]>([]);

  // Permissions
  canFindContacts = computed(() =>
    this.permissionService.hasPermission('sales-contact', 'sales-contact', 'find')
  );
  canViewContact = computed(() =>
    this.permissionService.hasPermission('sales-contact', 'sales-contact', 'findOne')
  );
  canAssignContact = computed(() =>
    this.permissionService.hasPermission('sales-contact', 'sales-contact', 'assign')
  );
  canQualifyContact = computed(() =>
    this.permissionService.hasPermission('sales-contact', 'sales-contact', 'qualify')
  );

  emptyTitle = signal(this.translate.instant('sales-pipeline.empty.no_contacts'));
  emptyMessage = signal(this.translate.instant('sales-pipeline.empty.no_contacts_message'));

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.updatePageTitle();
    this.initializeConfig();
    this.initializeListManager();
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
        label: this.translate.instant('breadcrumbs.sales-pipeline.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.sales-pipeline.commercial')
      },
      {
        label: this.translate.instant('breadcrumbs.sales-pipeline.pipeline'),
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(this.translate.instant('header.pages.admin.commercial.pipeline'));
  }

  private onLanguageChange(): void {
    setTimeout(() => {
      this.setBreadcrumbs();
      this.updatePageTitle();
      this.initializeConfig();
    }, 150);
  }

  private initializeListManager(): void {
    const defaultSort = this.sortOptions().length > 0
      ? { field: this.sortOptions()[0].value, direction: 'desc' as const }
      : { field: 'createdAt', direction: 'desc' as const };

    const config: ListStateConfig = {
      componentId: this.componentId,
      defaultSort: defaultSort,
      pageSize: 25,
      onLanguageChange: () => this.onLanguageChange()
    };

    this.listManager.initialize(
      config,
      (search, filters) => this.buildContactFilters(search, filters),
      (page, pageSize, filters, sortField, sortDirection) => this.loadInboundQueue(page, pageSize, filters, sortField, sortDirection),
      this.canFindContacts
    );
  }

  private initializeConfig(): void {
    this.filters.set([
      {
        key: 'status',
        type: 'select',
        label: this.translate.instant('sales-pipeline.filters.status'),
        placeholder: this.translate.instant('sales-pipeline.filters.allStatuses'),
        options: this.getStatusOptions()
      },
      {
        key: 'contact_type',
        type: 'select',
        label: this.translate.instant('sales-pipeline.filters.type'),
        placeholder: this.translate.instant('sales-pipeline.filters.allTypes'),
        options: this.getContactTypeOptions()
      },
      {
        key: 'urgency',
        type: 'select',
        label: this.translate.instant('sales-pipeline.filters.urgency'),
        placeholder: this.translate.instant('sales-pipeline.filters.allUrgencies'),
        options: this.getUrgencyOptions()
      }
    ]);

    this.sortOptions.set([
      { value: 'createdAt', label: this.translate.instant('sales-pipeline.sort.createdAt') },
      { value: 'updatedAt', label: this.translate.instant('sales-pipeline.sort.updatedAt') },
      { value: 'lead_score', label: this.translate.instant('sales-pipeline.sort.leadScore') },
      { value: 'company_name', label: this.translate.instant('sales-pipeline.sort.company') },
      { value: 'first_name', label: this.translate.instant('sales-pipeline.sort.name') }
    ]);

    this.columns.set([
      {
        key: 'first_name',
        label: this.translate.instant('sales-pipeline.columns.contact'),
        sortable: true,
        type: 'user',
        subtitleKey: 'email',
        render: (contact) => contact.first_name && contact.last_name
          ? `${contact.first_name} ${contact.last_name}`
          : contact.email || this.translate.instant('sales-pipeline.columns.noName')
      },
      {
        key: 'company_name',
        label: this.translate.instant('sales-pipeline.columns.company'),
        sortable: true,
        type: 'text'
      },
      {
        key: 'contact_type',
        label: this.translate.instant('sales-pipeline.columns.type'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (contact: SalesContact) => this.getContactTypeBadgeClass(contact.contact_type),
        render: (contact) => this.translate.instant(`sales-pipeline.badges.type_${contact.contact_type}`)
      },
      {
        key: 'sales_contact_status',
        label: this.translate.instant('sales-pipeline.columns.status'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (contact: SalesContact) => this.getStatusBadgeClass(contact.sales_contact_status),
        render: (contact) => this.translate.instant(`sales-pipeline.badges.${contact.sales_contact_status}`)
      },
      {
        key: 'urgency_level',
        label: this.translate.instant('sales-pipeline.columns.urgency'),
        sortable: true,
        type: 'custom-badge',
        cellClass: (contact: SalesContact) => this.getUrgencyBadgeClass(contact.urgency_level),
        render: (contact) => this.translate.instant(`sales-pipeline.badges.urgency_${contact.urgency_level}`)
      },
      {
        key: 'lead_score',
        label: this.translate.instant('sales-pipeline.columns.leadScore'),
        sortable: true,
        type: 'text',
        render: (contact) => contact.lead_score?.toString() || '-'
      },
      {
        key: 'createdAt',
        label: this.translate.instant('sales-pipeline.columns.createdAt'),
        sortable: true,
        type: 'date'
      }
    ]);

    this.actions.set([
      {
        label: this.translate.instant('sales-pipeline.actions.assign'),
        icon: 'person_add',
        class: 'btn-outline-primary',
        handler: (contact) => this.assignContact(contact),
        condition: (contact) => !contact.assigned_to && this.canAssignContact()
      },
      {
        label: this.translate.instant('sales-pipeline.actions.reassign'),
        icon: 'swap_horiz',
        class: 'btn-outline-warning',
        handler: (contact) => this.reassignContact(contact),
        condition: (contact) => !!contact.assigned_to && this.canAssignContact()
      },
      {
        label: this.translate.instant('sales-pipeline.actions.qualify'),
        icon: 'verified',
        class: 'btn-outline-success',
        handler: (contact) => this.qualifyContact(contact),
        condition: (contact) => ['new', 'contacted', 'interested'].includes(contact.sales_contact_status) && this.canQualifyContact()
      },
      {
        label: this.translate.instant('sales-pipeline.actions.view'),
        icon: 'visibility',
        class: 'btn-outline-secondary',
        handler: (contact) => this.viewContact(contact),
        condition: () => this.canViewContact()
      }
    ]);

    this.emptyTitle.set(this.translate.instant('sales-pipeline.empty.no_contacts'));
    this.emptyMessage.set(this.translate.instant('sales-pipeline.empty.no_contacts_message'));
  }

  private getStatusOptions(): Array<{ value: SalesContactStatus; label: string }> {
    const statuses: SalesContactStatus[] = [
      'new', 'contacted', 'qualified', 'interested',
      'demo_scheduled', 'demo_completed', 'proposal_sent',
      'negotiation', 'converted', 'lost'
    ];
    return statuses.map(status => ({
      value: status,
      label: this.translate.instant(`sales-pipeline.badges.${status}`)
    }));
  }

  private getContactTypeOptions(): Array<{ value: ContactType; label: string }> {
    const types: ContactType[] = ['label', 'distributor', 'artist', 'manager', 'publisher', 'pricing_inquiry', 'other'];
    return types.map(type => ({
      value: type,
      label: this.translate.instant(`sales-pipeline.badges.type_${type}`)
    }));
  }

  private getUrgencyOptions(): Array<{ value: UrgencyLevel; label: string }> {
    const urgencies: UrgencyLevel[] = ['low', 'normal', 'high', 'urgent'];
    return urgencies.map(urgency => ({
      value: urgency,
      label: this.translate.instant(`sales-pipeline.badges.urgency_${urgency}`)
    }));
  }

  private getStatusBadgeClass(status?: SalesContactStatus): string {
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
    return status ? classes[status] : 'bg-secondary-subtle text-secondary';
  }

  private getContactTypeBadgeClass(type?: ContactType): string {
    const classes: Record<ContactType, string> = {
      label: 'bg-success-subtle text-success',
      distributor: 'bg-primary-subtle text-primary',
      artist: 'bg-warning-subtle text-warning',
      manager: 'bg-info-subtle text-info',
      publisher: 'bg-secondary-subtle text-secondary',
      pricing_inquiry: 'bg-primary-subtle text-primary',
      other: 'bg-secondary-subtle text-secondary'
    };
    return type ? classes[type] : 'bg-secondary-subtle text-secondary';
  }

  private getUrgencyBadgeClass(urgency?: UrgencyLevel): string {
    const classes: Record<UrgencyLevel, string> = {
      low: 'bg-secondary-subtle text-secondary',
      normal: 'bg-info-subtle text-info',
      high: 'bg-warning-subtle text-warning',
      urgent: 'bg-danger-subtle text-danger'
    };
    return urgency ? classes[urgency] : 'bg-secondary-subtle text-secondary';
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

    return contactFilters;
  }

  private loadInboundQueue(
    page: number,
    pageSize: number,
    filters: ContactFilters,
    sortField: string,
    sortDirection: 'asc' | 'desc'
  ): void {
    this.adminSalesService.getInboundQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          let contacts = response.data;

          // Filtrage local
          if (filters.search) {
            const search = filters.search.toLowerCase().trim();
            contacts = contacts.filter(c =>
              c.first_name?.toLowerCase().includes(search) ||
              c.last_name?.toLowerCase().includes(search) ||
              c.email?.toLowerCase().includes(search) ||
              c.company_name?.toLowerCase().includes(search)
            );
          }

          if (filters.status) {
            contacts = contacts.filter(c => c.sales_contact_status === filters.status);
          }

          if (filters.contact_type) {
            contacts = contacts.filter(c => c.contact_type === filters.contact_type);
          }

          if (filters.urgency) {
            contacts = contacts.filter(c => c.urgency_level === filters.urgency);
          }

          // Tri local
          if (sortField) {
            contacts = contacts.sort((a, b) => {
              let aVal: any = a[sortField as keyof SalesContact];
              let bVal: any = b[sortField as keyof SalesContact];

              if (aVal === null || aVal === undefined) return 1;
              if (bVal === null || bVal === undefined) return -1;

              if (typeof aVal === 'string') aVal = aVal.toLowerCase();
              if (typeof bVal === 'string') bVal = bVal.toLowerCase();

              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              return sortDirection === 'asc' ? comparison : -comparison;
            });
          }

          // Pagination locale
          const total = contacts.length;
          const pageCount = Math.ceil(total / pageSize);
          const start = (page - 1) * pageSize;
          const paginatedContacts = contacts.slice(start, start + pageSize);

          this.listManager.setData(paginatedContacts, total, pageCount);
        },
        error: (err) => {
          console.error('Error loading inbound queue:', err);
          this.listManager.setError();
        }
      });
  }

  onActionClick(event: { action: ListAction<SalesContact>; row: SalesContact }): void {
    event.action.handler(event.row);
  }

  onRowClick(contact: SalesContact): void {
    if (this.canViewContact()) {
      this.viewContact(contact);
    }
  }

  viewContact(contact: SalesContact): void {
    this.router.navigate(['/admin/commercial/contacts', contact.documentId]);
  }

  assignContact(contact: SalesContact): void {
    this.contactModalService.openAssign(contact, () => {
      this.listManager.reload();
    });
  }

  reassignContact(contact: SalesContact): void {
    this.contactModalService.openReassign(contact, () => {
      this.listManager.reload();
    });
  }

  qualifyContact(contact: SalesContact): void {
    this.contactModalService.openQualify(contact, () => {
      this.listManager.reload();
    });
  }
}
