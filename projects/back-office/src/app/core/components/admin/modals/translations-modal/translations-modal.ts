import { Component, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Modal } from 'shared-lib';
import { TranslationsModalService, TranslationOption } from '../../../../services/admin/modals/translations-modal.service';

@Component({
  selector: 'app-translations-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, Modal],
  templateUrl: './translations-modal.html',
  styleUrl: './translations-modal.css'
})
export class TranslationsModal {
  private modalService = inject(TranslationsModalService);

  isOpen = computed(() => {
    const state = this.modalService.getState();
    return state.isOpen && state.translations && state.translations.length > 0;
  });

  translations = computed(() => this.modalService.getState().translations);

  constructor() {
    effect(() => {
      const state = this.modalService.getState();
      if (state.isOpen) {
        untracked(() => {
          // Modal opened
        });
      }
    });
  }

  selectTranslation(translation: TranslationOption): void {
    const state = this.modalService.getState();
    if (state.onSelect) {
      state.onSelect(translation);
    }
    this.close();
  }

  close(): void {
    this.modalService.close();
  }
}
