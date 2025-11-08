export interface MediaItem {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  folder?: string;
}

export interface MediaPickerConfig {
  multiple?: boolean;
  accept?: string[];
  maxSelection?: number;
  showUpload?: boolean;
}

export interface MediaPickerState {
  isOpen: boolean;
  selectedItems: MediaItem[];
  config: MediaPickerConfig;
  onSelect?: (items: MediaItem[]) => void;
  onClose?: () => void;
}
