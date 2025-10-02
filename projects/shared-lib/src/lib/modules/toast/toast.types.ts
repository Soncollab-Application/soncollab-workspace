export type ToastType = 'default' | 'error' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
export type ToastStyle = 'solid' | 'border';
export type ToastPosition =
  | 'top-start' | 'top-center' | 'top-end'
  | 'middle-start' | 'middle-center' | 'middle-end'
  | 'bottom-start' | 'bottom-center' | 'bottom-end';

export type ToastVariant = 'tiny' | 'tiny-icon' | 'header';

export interface ToastItem {
  id: string;
  type: ToastType;
  style?: ToastStyle;
  title?: string;
  message: string;
  icon?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  autohide?: boolean;
  delay?: number;
  timestamp?: Date;
  actionButtons?: ToastAction[];
}

export interface ToastAction {
  label: string;
  cssClass?: string;
  callback: () => void;
}

export interface ToastConfig {
  type?: ToastType;
  style?: ToastStyle;
  title?: string;
  icon?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  autohide?: boolean;
  delay?: number;
  actionButtons?: ToastAction[];
}
