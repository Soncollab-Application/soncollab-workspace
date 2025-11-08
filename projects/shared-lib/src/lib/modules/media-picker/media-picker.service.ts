import {MediaItem, MediaPickerConfig, MediaPickerState} from './media-picker.model';
import {computed, Injectable, signal} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MediaPickerService {
  private state = signal<MediaPickerState>({
    isOpen: false,
    selectedItems: [],
    config: {
      multiple: false,
      accept: ['image'],
      maxSelection: 1,
      showUpload: true
    }
  });

  isOpen = computed(() => this.state().isOpen);
  selectedItems = computed(() => this.state().selectedItems);
  config = computed(() => this.state().config);

  open(config: MediaPickerConfig, onSelect: (items: MediaItem[]) => void): void {
    const mergedConfig: MediaPickerConfig = {
      multiple: false,
      accept: ['image'],
      maxSelection: 1,
      showUpload: true,
      ...config
    };

    this.state.set({
      isOpen: true,
      selectedItems: [],
      config: mergedConfig,
      onSelect,
      onClose: undefined
    });
  }

  close(): void {
    const currentState = this.state();

    if (currentState.onClose) {
      currentState.onClose();
    }

    this.state.set({
      isOpen: false,
      selectedItems: [],
      config: currentState.config,
      onSelect: undefined,
      onClose: undefined
    });
  }

  selectItem(item: MediaItem): void {
    const currentState = this.state();
    const { multiple, maxSelection } = currentState.config;

    if (!multiple) {
      // Single selection - remplacer
      this.state.update(state => ({
        ...state,
        selectedItems: [item]
      }));
    } else {
      // Multiple selection
      const isAlreadySelected = currentState.selectedItems.some(i => i.id === item.id);

      if (isAlreadySelected) {
        // Désélectionner
        this.state.update(state => ({
          ...state,
          selectedItems: state.selectedItems.filter(i => i.id !== item.id)
        }));
      } else {
        // Ajouter si pas dépassé la limite
        if (currentState.selectedItems.length < (maxSelection || 999)) {
          this.state.update(state => ({
            ...state,
            selectedItems: [...state.selectedItems, item]
          }));
        }
      }
    }
  }

  isSelected(itemId: number): boolean {
    return this.state().selectedItems.some(item => item.id === itemId);
  }

  confirm(): void {
    const currentState = this.state();

    if (currentState.onSelect && currentState.selectedItems.length > 0) {
      currentState.onSelect(currentState.selectedItems);
    }

    this.close();
  }

  getState(): MediaPickerState {
    return this.state();
  }
}
