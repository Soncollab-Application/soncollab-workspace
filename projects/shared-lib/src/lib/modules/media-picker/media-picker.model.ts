export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

export type FilterField = 'createdAt' | 'updatedAt' | 'type';
export type FilterOperator = 'is' | 'isNot' | 'greaterThan' | 'greaterThanOrEqual' | 'lowerThan' | 'lowerThanOrEqual';

export interface MediaItem {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  type: MediaType;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  folder?: string | null;
  tags?: string[];
  alt?: string;
  caption?: string;
  ext: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string | null;
  itemCount: number;
  assetCount: number;
  createdAt: string;
}

export interface MediaPickerConfig {
  multiple?: boolean;
  accept?: MediaType[];
  maxSelection?: number;
  showUpload?: boolean;
  allowedExtensions?: string[];
  maxFileSize?: number;
  allowFolderCreation?: boolean;
  allowUrlUpload?: boolean;
}

export interface MediaPickerState {
  isOpen: boolean;
  selectedItems: MediaItem[];
  config: MediaPickerConfig;
  onSelect?: (items: MediaItem[]) => void;
  onClose?: () => void;
}

export interface AdvancedFilter {
  field: FilterField | null;
  operator: FilterOperator | null;
  value: string | MediaType | null;
}

export interface MediaFilter {
  search: string;
  type: MediaType | 'all';
  folder: string | null;
  folderPath: string[];
  sortBy: 'name' | 'date' | 'size';
  sortOrder: 'asc' | 'desc';
  advancedFilter: AdvancedFilter | null;
}

export type ViewMode = 'grid' | 'list';
export type ActiveTab = 'browse' | 'selected';
export type UploadMode = 'computer' | 'url';
