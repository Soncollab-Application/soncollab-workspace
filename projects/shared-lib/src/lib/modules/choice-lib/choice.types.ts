export type ChoicesInstance = any;
export type ChoiceConfig = any;

export interface ChoiceOption {
  value: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  customProperties?: Record<string, any>;
  placeholder?: boolean;
}

export interface ChoiceGroup {
  label: string;
  disabled?: boolean;
  choices: ChoiceOption[];
}

export interface ChoiceEventDetail {
  id?: number;
  value: string;
  label?: string;
  customProperties?: Record<string, any>;
  groupValue?: string;
  keyCode?: number;
}
