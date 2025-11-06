import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';

export interface OffcanvasConfig {
  placement?: 'start' | 'end' | 'top' | 'bottom';
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  scroll?: boolean;
  data?: any;
  onSuccess?: () => void;
  onClose?: () => void;
}

export interface OffcanvasState {
  isOpen: boolean;
  config: OffcanvasConfig;
  data?: any;
  onSuccess?: () => void;
  onClose?: () => void;
}

@Injectable({ providedIn: 'root' })
export class OffcanvasService {
  private destroyRef = inject(DestroyRef);

  private state = signal<OffcanvasState>({
    isOpen: false,
    config: {
      placement: 'end',
      backdrop: true,
      keyboard: true,
      scroll: false
    }
  });

  isOpen = computed(() => this.state().isOpen);
  config = computed(() => this.state().config);
  data = computed(() => this.state().data);

  open(config: OffcanvasConfig = {}): void {
    const mergedConfig: OffcanvasConfig = {
      placement: 'end',
      backdrop: true,
      keyboard: true,
      scroll: false,
      ...config
    };

    if (!mergedConfig.scroll) {
      document.body.classList.add('offcanvas-open');
    }

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

    document.body.classList.remove('offcanvas-open');

    this.state.set({
      isOpen: false,
      config: currentState.config,
      data: undefined,
      onSuccess: undefined,
      onClose: undefined
    });
  }

  getState(): OffcanvasState {
    return this.state();
  }

  updateData(data: any): void {
    this.state.update(current => ({
      ...current,
      data: { ...current.data, ...data }
    }));
  }
}
