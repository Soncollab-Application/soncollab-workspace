export type AlertType =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

export interface AlertConfig {
  type: AlertType;
  message: string;
  icon?: string;
  dismissible?: boolean;
  heading?: string;
  additionalContent?: string;
  link?: {
    text: string;
    url: string;
  };
}
