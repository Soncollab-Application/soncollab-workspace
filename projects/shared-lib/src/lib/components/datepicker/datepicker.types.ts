export type DatepickerMode = 'date' | 'time' | 'datetime' | 'range';

export interface DatepickerOptions {
  dateFormat?: string;
  enableTime?: boolean;
  noCalendar?: boolean;
  time_24hr?: boolean;
  minDate?: string | Date;
  maxDate?: string | Date;
  defaultDate?: string | Date;
  mode?: 'single' | 'multiple' | 'range';
  [key: string]: any;
}
