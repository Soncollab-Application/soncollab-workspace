export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  colspan?: number;
  type?: 'text' | 'date' | 'badge' | 'image' | 'user' | 'phone' | 'email' | 'custom' | 'custom-badge';
  render?: (row: T) => string;
  cellClass?: string | ((row: T) => string);
  // Pour le type 'user'
  avatarKey?: string;
  subtitleKey?: string;
  // Pour le type 'phone' ou 'email'
  linkPrefix?: 'tel:' | 'mailto:';
}

export interface TableAction<T = any> {
  label: string;
  icon?: string;
  class?: string;
  condition?: (row: T) => boolean;
  handler: (row: T) => void;
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
}
