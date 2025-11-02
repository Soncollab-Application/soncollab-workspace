import {Component, signal} from '@angular/core';
import {CardAction, CardColumn, DataCard} from 'shared-lib';

interface TestContact {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    DataCard
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  loading = signal(false);

  contacts = signal<TestContact[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
      status: 'new'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      company: 'TechStart',
      status: 'qualified'
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      company: 'MusicLabel Inc',
      status: 'contacted'
    }
  ]);

  columns = signal<CardColumn<TestContact>[]>([
    {
      key: 'name',
      label: 'Nom',
      type: 'text'
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email'
    },
    {
      key: 'company',
      label: 'Entreprise',
      type: 'text'
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'custom-badge',
      render: (contact) => contact.status.toUpperCase(),
      cellClass: (contact) => {
        switch(contact.status) {
          case 'new': return 'text-info bg-info-subtle';
          case 'qualified': return 'text-success bg-success-subtle';
          case 'contacted': return 'text-warning bg-warning-subtle';
          default: return 'text-secondary bg-secondary-subtle';
        }
      }
    }
  ]);

  actions = signal<CardAction<TestContact>[]>([
    {
      label: 'Voir',
      icon: 'visibility',
      handler: (contact) => this.viewContact(contact)
    },
    {
      label: 'Modifier',
      icon: 'edit',
      handler: (contact) => this.editContact(contact)
    },
    {
      label: 'Supprimer',
      icon: 'delete',
      handler: (contact) => this.deleteContact(contact)
    }
  ]);

  onCardClick(contact: TestContact): void {
    console.log('Card clicked:', contact);
    alert(`Card clicked: ${contact.name}`);
  }

  onActionClick(event: { action: CardAction<TestContact>; row: TestContact }): void {
    console.log('Action clicked:', event);
  }

  viewContact(contact: TestContact): void {
    alert(`Voir: ${contact.name}`);
  }

  editContact(contact: TestContact): void {
    alert(`Modifier: ${contact.name}`);
  }

  deleteContact(contact: TestContact): void {
    alert(`Supprimer: ${contact.name}`);
  }
}
