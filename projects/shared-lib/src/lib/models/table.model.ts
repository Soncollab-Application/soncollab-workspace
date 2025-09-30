export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  type?: 'text' | 'date' | 'badge' | 'image' | 'custom';
  render?: (row: T) => string;
  cellClass?: string | ((row: T) => string);
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
