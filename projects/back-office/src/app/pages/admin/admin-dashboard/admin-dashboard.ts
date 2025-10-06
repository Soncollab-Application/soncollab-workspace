import {Component, inject, signal} from '@angular/core';
import {DataTableComponent, FilterBarComponent, FilterConfig, FilterValue, PaginationState, SortConfig, SortOption, TableAction, TableColumn } from "shared-lib";
import {CommonModule} from '@angular/common';

interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  company: string;
  phone: string;
  location: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule, FilterBarComponent, DataTableComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  loading = signal(false);
  selectedCount = signal(0);
  currentSort = signal<SortConfig>({ field: 'name', direction: 'asc' });

  filters = signal<FilterConfig[]>([
    {
      key: 'company',
      type: 'select',
      label: 'Company',
      placeholder: 'Select company',
      options: [
        { label: 'All', value: '' },
        { label: 'TechPinnacle Solutions', value: 'TechPinnacle Solutions' },
        { label: 'Quantum Dynamics', value: 'Quantum Dynamics' },
        { label: 'Pinnacle Technologies', value: 'Pinnacle Technologies' },
        { label: 'Apex Innovations', value: 'Apex Innovations' },
        { label: 'Vertex Solutions', value: 'Vertex Solutions' }
      ]
    },
    {
      key: 'location',
      type: 'select',
      label: 'Location',
      placeholder: 'Select location',
      options: [
        { label: 'All', value: '' },
        { label: 'San Francisco, CA', value: 'San Francisco, CA' },
        { label: 'Austin, TX', value: 'Austin, TX' },
        { label: 'Miami, FL', value: 'Miami, FL' },
        { label: 'Seattle, WA', value: 'Seattle, WA' }
      ]
    }
  ]);

  sortOptions = signal<SortOption[]>([
    { value: 'name', label: 'User' },
    { value: 'company', label: 'Company' },
    { value: 'phone', label: 'Phone' },
    { value: 'location', label: 'Location' }
  ]);

  columns = signal<TableColumn<Customer>[]>([
    {
      key: 'name',
      label: 'User',
      sortable: true,
      type: 'user',
      avatarKey: 'avatar',
      subtitleKey: 'email'
    },
    {
      key: 'company',
      label: 'Company',
      sortable: true
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'phone'
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      colspan: 2
    }
  ]);

  actions = signal<TableAction<Customer>[]>([
    {
      label: 'View',
      icon: 'eye',
      handler: (row) => console.log('View:', row)
    },
    {
      label: 'Edit',
      icon: 'pencil',
      handler: (row) => console.log('Edit:', row)
    },
    {
      label: 'Delete',
      icon: 'trash',
      handler: (row) => console.log('Delete:', row)
    }
  ]);

  private allData = signal<Customer[]>([
    {
      id: '1',
      name: 'John Williams',
      email: 'james.smith@example.com',
      avatar: 'https://img.freepik.com/vecteurs-libre/illustration-du-jeune-homme-souriant_1308-174669.jpg',
      company: 'TechPinnacle Solutions',
      phone: '(202) 555-0126',
      location: 'San Francisco, CA'
    },
    {
      id: '2',
      name: 'Michael Johnson',
      email: 'michael.johnson@example.com',
      avatar: 'https://img.freepik.com/vecteurs-libre/illustration-du-jeune-homme-souriant_1308-174669.jpg',
      company: 'Quantum Dynamics',
      phone: '(202) 555-0181',
      location: 'San Francisco, CA'
    },
    {
      id: '3',
      name: 'Emily Thompson',
      email: 'emily.thompson@example.com',
      avatar: 'https://img.freepik.com/vecteurs-libre/illustration-du-jeune-homme-souriant_1308-174669.jpg',
      company: 'Pinnacle Technologies',
      phone: '(415) 555-0192',
      location: 'Austin, TX'
    },
    {
      id: '4',
      name: 'Robert Garcia',
      email: 'robert.garcia@example.com',
      avatar: 'https://img.freepik.com/vecteurs-libre/illustration-du-jeune-homme-souriant_1308-174669.jpg',
      company: 'Apex Innovations',
      phone: '(312) 555-0324',
      location: 'Miami, FL'
    },
    {
      id: '5',
      name: 'Jessica Miller',
      email: 'jessica.miller@example.com',
      avatar: 'https://img.freepik.com/vecteurs-libre/illustration-du-jeune-homme-souriant_1308-174669.jpg',
      company: 'Vertex Solutions',
      phone: '(213) 555-0456',
      location: 'Seattle, WA'
    }
  ]);

  searchTerm = signal('');
  filterValues = signal<FilterValue>({});
  filteredData = signal<Customer[]>(this.allData());

  pagination = signal<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    total: this.allData().length,
    pageCount: Math.ceil(this.allData().length / 10)
  });

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.applyFilters();
  }

  onFilterChange(values: FilterValue): void {
    this.filterValues.set(values);
    this.applyFilters();
  }

  onSortChange(sort: SortConfig): void {
    this.currentSort.set(sort);
    this.applySort();
  }

  private applyFilters(): void {
    let data = [...this.allData()];
    const term = this.searchTerm().toLowerCase();
    const filters = this.filterValues();

    // Search
    if (term) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.company.toLowerCase().includes(term)
      );
    }

    // Filters
    if (filters['company']) {
      data = data.filter(item => item.company === filters['company']);
    }
    if (filters['location']) {
      data = data.filter(item => item.location === filters['location']);
    }

    this.filteredData.set(data);
    this.applySort();
  }

  private applySort(): void {
    const sort = this.currentSort();
    const data = [...this.filteredData()];

    data.sort((a, b) => {
      const aVal = (a as any)[sort.field] || '';
      const bVal = (b as any)[sort.field] || '';
      const comparison = aVal.localeCompare(bVal);
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    this.filteredData.set(data);
  }

  onPageChange(page: number): void {
    this.pagination.update(p => ({ ...p, currentPage: page }));
  }

  onActionClick(event: { action: TableAction<Customer>; row: Customer }): void {
    event.action.handler(event.row);
  }

  onRowClick(row: Customer): void {
    console.log('Row clicked:', row);
  }

  onSelectionChange(selected: Customer[]): void {
    this.selectedCount.set(selected.length);
    console.log('Selection changed:', selected);
  }
}
