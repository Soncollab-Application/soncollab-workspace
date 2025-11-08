import { Injectable, signal, computed } from '@angular/core';
import {ModalConfig, ModalState} from "./modal.model";

@Injectable({ providedIn: 'root' })
export class ModalService {
  private state = signal<ModalState>({
    isOpen: false,
    config: {
      size: 'default',
      centered: false,
      scrollable: false,
      backdrop: true,
      keyboard: true
    }
  });

  isOpen = computed(() => this.state().isOpen);
  config = computed(() => this.state().config);
  data = computed(() => this.state().data);

  open(config: ModalConfig = {}): void {
    const mergedConfig: ModalConfig = {
      size: 'default',
      centered: false,
      scrollable: false,
      backdrop: true,
      keyboard: true,
      ...config
    };

    document.body.classList.add('modal-open');

    this.state.set({
      isOpen: true,
      config: mergedConfig,
      data: config.data,
      onSuccess: config.onSuccess,
      onClose: config.onClose
    });
  }

  close(): void {
    const currentState = this.state();

    if (currentState.onClose) {
      currentState.onClose();
    }

    document.body.classList.remove('modal-open');

    this.state.set({
      isOpen: false,
      config: currentState.config,
      data: undefined,
      onSuccess: undefined,
      onClose: undefined
    });
  }

  getState(): ModalState {
    return this.state();
  }

  updateData(data: any): void {
    this.state.update(current => ({
      ...current,
      data: { ...current.data, ...data }
    }));
  }
}
