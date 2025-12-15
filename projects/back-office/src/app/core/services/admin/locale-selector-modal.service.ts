import { Injectable, inject, signal } from '@angular/core';
import { ModalService } from 'shared-lib';

export interface LocaleOption {
  code: string;
  label: string;
  flag: string;
}

export interface LocaleSelectorModalState {
  isOpen: boolean;
  availableLocales: LocaleOption[];
  onSelect?: (locale: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class LocaleSelectorModalService {
  private modalService = inject(ModalService);

  private state = signal<LocaleSelectorModalState>({
    isOpen: false,
    availableLocales: []
  });

  getState = this.state.asReadonly();

  open(availableLocales: LocaleOption[], onSelect: (locale: string) => void): void {
    this.state.set({
      isOpen: true,
      availableLocales,
      onSelect
    });

    this.modalService.open({
      size: 'default',
      centered: true,
      backdrop: 'static',
      keyboard: true
    });
  }

  close(): void {
    this.modalService.close();
    this.state.set({
      isOpen: false,
      availableLocales: []
    });
  }
}
