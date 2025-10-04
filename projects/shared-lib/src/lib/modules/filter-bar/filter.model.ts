import {ChoiceGroup} from '../choice-lib';

export interface FilterConfig {
  key: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'boolean';
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  groups?: ChoiceGroup[];
  choiceConfig?: any;
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
