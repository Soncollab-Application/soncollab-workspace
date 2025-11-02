export interface CardColumn<T = any> {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'badge' | 'image' | 'user' | 'phone' | 'email' | 'custom-badge' | 'custom';
  render?: (row: T) => string;
  cellClass?: string | ((row: T) => string);
  avatarKey?: string;
  subtitleKey?: string;
  avatarTransform?: (url: string) => string;
  format?: (value: any) => string;
  icon?: string;
  showInCard?: boolean;
}

export interface CardAction<T = any> {
  label: string;
  icon?: string;
  class?: string;
  condition?: (row: T) => boolean;
  handler: (row: T) => void;
}

export interface CardConfig<T = any> {
  columns: CardColumn<T>[];
  actions?: CardAction<T>[];
  clickable?: boolean;
  selectable?: boolean;
}
