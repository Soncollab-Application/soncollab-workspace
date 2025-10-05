import {ChoiceGroup} from '../choice-lib';

export interface FilterConfig {
  key: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'boolean';
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  groups?: ChoiceGroup[];
  choiceConfig?: any;
  avatarField?: string; // Pour afficher des avatars dans les options
}

export interface FilterOption {
  label: string;
  value: any;
  avatarSrc?: string; // Pour les avatars
}

export interface FilterValue {
  [key: string]: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SortOption {
  value: string;
  label: string;
}
