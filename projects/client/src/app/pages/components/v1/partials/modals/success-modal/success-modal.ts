import { Component, inject, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-success-modal',
  imports: [
    TranslatePipe,
    CommonModule
  ],
  standalone: true,
  templateUrl: './success-modal.html',
  styleUrl: './success-modal.css'
})
export class SuccessModal {
  activeModal = inject(NgbActiveModal);

  @Input() successMessage: string = '';
  @Input() responseData: any = null;


  closeModal(): void {
    this.activeModal.close();
  }

  dismissModal(): void {
    this.activeModal.dismiss();
  }
}
