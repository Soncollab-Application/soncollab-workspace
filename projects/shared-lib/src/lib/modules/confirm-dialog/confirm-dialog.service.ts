import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private modalService = inject(NgbModal);
  private translate = inject(TranslateService);

  constructor() {
    this.translate.setTranslation('en', { confirmDialog: enTranslations.confirmDialog }, true);
    this.translate.setTranslation('fr', { confirmDialog: frTranslations.confirmDialog }, true);
  }

  open(data: ConfirmDialogData): Promise<boolean> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
      backdrop: 'static'
    });

    modalRef.componentInstance.data = () => data;

    return modalRef.result.then(
      (result) => result === true,
      () => false
    );
  }

  confirmDelete(itemName?: string): Promise<boolean> {
    const title = this.translate.instant('confirmDialog.delete.title');
    const message = itemName
      ? this.translate.instant('confirmDialog.delete.messageWithName', { name: itemName })
      : this.translate.instant('confirmDialog.delete.message');
    const confirmText = this.translate.instant('confirmDialog.delete.confirm');
    const cancelText = this.translate.instant('confirmDialog.cancel');

    return this.open({
      title,
      message,
      confirmText,
      cancelText,
      confirmClass: 'btn-danger',
      icon: 'trash',
      iconClass: 'text-danger'
    });
  }
}
