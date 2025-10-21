import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private modalService = inject(NgbModal);
  private translate = inject(TranslateService);

  constructor() {
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
    const title = this.translate.instant('confirmDialogShared.delete.title');
    const message = itemName
      ? this.translate.instant('confirmDialogShared.delete.messageWithName', { name: itemName })
      : this.translate.instant('confirmDialogShared.delete.message');
    const confirmText = this.translate.instant('confirmDialogShared.delete.confirm');
    const cancelText = this.translate.instant('confirmDialogShared.cancel');

    return this.open({
      title,
      message,
      confirmText,
      cancelText,
      confirmClass: 'btn-danger',
      icon: 'delete',
      iconClass: 'text-danger'
    });
  }
}
