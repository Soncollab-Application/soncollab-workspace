import { Injectable, inject } from '@angular/core';
import { OffcanvasService } from 'shared-lib';

@Injectable({
  providedIn: 'root'
})
export class InviteOffcanvasService {
  private offcanvasService = inject(OffcanvasService);

  open(onSuccess?: () => void): void {
    this.offcanvasService.open({
      placement: 'end',
      backdrop: true,
      keyboard: true,
      scroll: false,
      onSuccess
    });
  }

  close(): void {
    this.offcanvasService.close();
  }

  getState() {
    return this.offcanvasService.getState();
  }
}
