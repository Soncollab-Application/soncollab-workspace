export type BadgeType =
  | 'primary'
  | 'secondary'
  | 'secondary-alt'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

export type BadgeVariant = 'solid' | 'outline' | 'subtle';

export type BadgeShape = 'rounded' | 'pill' | 'square';

export interface BadgeConfig {
  type: BadgeType;
  variant?: BadgeVariant;
  shape?: BadgeShape;
  icon?: string;
  iconPosition?: 'left' | 'right';
  text?: string;
}
