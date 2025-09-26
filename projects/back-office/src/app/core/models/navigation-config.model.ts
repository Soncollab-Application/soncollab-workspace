export interface NavigationItem {
  key: string;
  icon: string;
  route?: string;
  children?: NavigationItem[];
}

export interface NavigationConfig {
  type: 'section' | 'separator' | 'nav';
  title?: string;
  items?: NavigationItem[];
  navId?: string;
}
