import {Component, inject, input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';

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


  getTitle(): string {
    return this.data().title || this.translate.instant('confirmDialogShared.title');
  }

  getConfirmText(): string {
    return this.data().confirmText || this.translate.instant('confirmDialogShared.confirm');
  }

  getCancelText(): string {
    return this.data().cancelText || this.translate.instant('confirmDialogShared.cancel');
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
