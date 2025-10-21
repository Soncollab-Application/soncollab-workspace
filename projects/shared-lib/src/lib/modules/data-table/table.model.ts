export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  colspan?: number;
  type?: 'text' | 'date' | 'badge' | 'image' | 'user' | 'phone' | 'email' | 'custom-badge' | 'custom';
  render?: (row: T) => string;
  cellClass?: string | ((row: T) => string);
  avatarKey?: string;
  subtitleKey?: string;
  avatarTransform?: (url: string) => string;
  format?: (value: any) => string;
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
