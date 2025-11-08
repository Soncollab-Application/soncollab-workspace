import {computed, Injectable, signal} from '@angular/core';

export interface ModalConfig {
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'fullscreen';
  centered?: boolean;
  scrollable?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  data?: any;
  onSuccess?: (result?: any) => void;
  onClose?: () => void;
}

export interface ModalState {
  isOpen: boolean;
  config: ModalConfig;
  data?: any;
  onSuccess?: (result?: any) => void;
  onClose?: () => void;
}
