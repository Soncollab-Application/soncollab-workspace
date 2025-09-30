import {Component, inject, input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
  icon?: string;
  iconClass?: string;
}

@Component({
  selector: 'lib-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  activeModal = inject(NgbActiveModal);
  private translate = inject(TranslateService);

  data = input.required<ConfirmDialogData>();

  ngOnInit(): void {
    this.translate.setTranslation('en', { confirmDialog: enTranslations.confirmDialog }, true);
    this.translate.setTranslation('fr', { confirmDialog: frTranslations.confirmDialog }, true);
  }

  getTitle(): string {
    return this.data().title || this.translate.instant('confirmDialog.title');
  }

  getConfirmText(): string {
    return this.data().confirmText || this.translate.instant('confirmDialog.confirm');
  }

  getCancelText(): string {
    return this.data().cancelText || this.translate.instant('confirmDialog.cancel');
  }

  getConfirmClass(): string {
    return this.data().confirmClass || 'btn-danger';
  }

  confirm(): void {
    this.activeModal.close(true);
  }

  cancel(): void {
    this.activeModal.dismiss(false);
  }
}
