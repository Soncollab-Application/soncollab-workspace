export interface FilterConfig {
  key: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'boolean';
  label: string;
  placeholder?: string;
  options?: FilterOption[];
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface FilterValue {
  [key: string]: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}
