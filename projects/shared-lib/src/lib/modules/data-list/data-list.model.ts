export interface ListColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  colspan?: number;
  type?: 'text' | 'date' | 'badge' | 'image' | 'user' | 'phone' | 'email' | 'custom-badge' | 'custom' | 'icon';
  render?: (row: T) => string;
  cellClass?: string | ((row: T) => string);
  avatarKey?: string;
  subtitleKey?: string;
  avatarTransform?: (url: string) => string;
  format?: (value: any) => string;
  icon?: string;
  showInCard?: boolean;
  iconRender?: (row: T) => string;
}

export interface ListAction<T = any> {
  label: string;
  icon?: string;
  class?: string;
  condition?: (row: T) => boolean;
  handler: (row: T) => void;
}

export interface ListConfig<T = any> {
  columns: ListColumn<T>[];
  actions?: ListAction<T>[];
  selectable?: boolean;
  clickable?: boolean;
  view?: 'table' | 'card';
}
