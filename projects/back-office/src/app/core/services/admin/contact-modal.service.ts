import { Injectable, signal, computed } from '@angular/core';
import { SalesContact } from '../../models/sales/sales-contact.model';

export type ContactModalType = 'assign' | 'reassign' | 'qualify';

export interface ContactModalState {
  isOpen: boolean;
  type: ContactModalType | null;
  contact: SalesContact | null;
  onSuccess?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContactModalService {
  private state = signal<ContactModalState>({
    isOpen: false,
    type: null,
    contact: null
  });

  // Exposer directement le signal, pas une fonction
  readonly state$ = this.state.asReadonly();

  openAssign(contact: SalesContact, onSuccess?: () => void): void {
    this.state.set({
      isOpen: true,
      type: 'assign',
      contact,
      onSuccess
    });
  }

  openReassign(contact: SalesContact, onSuccess?: () => void): void {
    this.state.set({
      isOpen: true,
      type: 'reassign',
      contact,
      onSuccess
    });
  }

  openQualify(contact: SalesContact, onSuccess?: () => void): void {
    this.state.set({
      isOpen: true,
      type: 'qualify',
      contact,
      onSuccess
    });
  }

  close(): void {
    this.state.set({
      isOpen: false,
      type: null,
      contact: null
    });
  }
}
