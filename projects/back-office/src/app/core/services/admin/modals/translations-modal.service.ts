import { Injectable, inject, signal } from '@angular/core';
import { ModalService } from 'shared-lib';

export interface TranslationOption {
  locale: string;
  flag: string;
  label: string;
  documentId: string;
}

export interface TranslationsModalState {
  isOpen: boolean;
  translations: TranslationOption[];
  onSelect?: (translation: TranslationOption) => void;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationsModalService {
  private modalService = inject(ModalService);

  private state = signal<TranslationsModalState>({
    isOpen: false,
    translations: []
  });

  getState = this.state.asReadonly();

  open(translations: TranslationOption[], onSelect: (translation: TranslationOption) => void): void {
    this.state.set({
      isOpen: true,
      translations,
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
      translations: []
    });
  }
}
