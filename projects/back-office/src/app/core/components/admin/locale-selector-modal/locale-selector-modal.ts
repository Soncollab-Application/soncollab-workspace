import {Component, computed, effect, inject, untracked} from '@angular/core';
import {LocaleOption, LocaleSelectorModalService} from '../../../services/admin/locale-selector-modal.service';
import {Modal} from 'shared-lib';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-locale-selector-modal',
  imports: [
    Modal,
    TranslatePipe
  ],
  templateUrl: './locale-selector-modal.html',
  styleUrl: './locale-selector-modal.css',
})
export class LocaleSelectorModal {
  private modalService = inject(LocaleSelectorModalService);

  isOpen = computed(() => this.modalService.getState().isOpen);
  availableLocales = computed(() => this.modalService.getState().availableLocales);

  constructor() {
    effect(() => {
      const state = this.modalService.getState();
      if (state.isOpen) {
        untracked(() => {
        });
      }
    });
  }

  selectLocale(locale: LocaleOption): void {
    const state = this.modalService.getState();
    if (state.onSelect) {
      state.onSelect(locale.code);
    }
    this.close();
  }

  close(): void {
    this.modalService.close();
  }

}
