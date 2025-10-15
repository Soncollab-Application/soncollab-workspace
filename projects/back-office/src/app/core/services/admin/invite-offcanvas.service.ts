import { Injectable, signal } from '@angular/core';

export interface InviteOffcanvasState {
  isOpen: boolean;
  onSuccess?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class InviteOffcanvasService {
  private state = signal<InviteOffcanvasState>({ isOpen: false });

  getState = this.state.asReadonly();

  open(onSuccess?: () => void): void {
    this.state.set({ isOpen: true, onSuccess });
  }

  close(): void {
    this.state.set({ isOpen: false });
  }
}
