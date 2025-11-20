import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  forwardRef,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import {DatepickerMode, DatepickerOptions} from './datepicker.types';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
declare const flatpickr: any;

@Component({
  selector: 'lib-datepicker',
  imports: [],
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Datepicker),
      multi: true
    }
  ]
})
export class Datepicker implements ControlValueAccessor, AfterViewInit {
  readonly placeholder = input<string>('Choose date');
  readonly disabled = input<boolean>(false);
  readonly mode = input<DatepickerMode>('date');
  readonly options = input<DatepickerOptions>({});
  readonly icon = input<string>('fi-calendar');
  readonly label = input<string>('');
  readonly required = input<boolean>(false);

  readonly valueChange = output<string | string[]>();

  readonly value = signal<string | string[]>('');
  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('datepickerInput');

  private flatpickrInstance?: any;
  private onChange: (value: string | string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      if (this.flatpickrInstance) {
        if (this.disabled()) {
          this.flatpickrInstance.input.disabled = true;
        } else {
          this.flatpickrInstance.input.disabled = false;
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initFlatpickr();
  }

  private initFlatpickr(): void {
    const inputEl = this.inputElement()?.nativeElement;
    if (!inputEl) return;

    const defaultOptions = this.getDefaultOptions();
    const userOptions = this.options();

    this.flatpickrInstance = flatpickr(inputEl, {
      ...defaultOptions,
      ...userOptions,
      onChange: (selectedDates: Date[], dateStr: string) => {
        const value = this.mode() === 'range' && selectedDates.length === 2
          ? selectedDates.map(d => this.formatDate(d))
          : dateStr;

        this.value.set(value);
        this.onChange(value);
        this.valueChange.emit(value);
      },
      onClose: () => {
        this.onTouched();
      }
    });
  }

  private getDefaultOptions(): DatepickerOptions {
    const mode = this.mode();

    switch (mode) {
      case 'time':
        return {
          enableTime: true,
          noCalendar: true,
          dateFormat: 'H:i',
          time_24hr: true
        };
      case 'datetime':
        return {
          enableTime: true,
          dateFormat: 'Y-m-d H:i'
        };
      case 'range':
        return {
          mode: 'range',
          dateFormat: 'Y-m-d'
        };
      case 'date':
      default:
        return {
          dateFormat: 'Y-m-d'
        };
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  writeValue(value: string | string[]): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.setDate(value, false);
      this.value.set(value || '');
    }
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.input.disabled = isDisabled;
    }
  }

  clear(): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.clear();
      this.value.set('');
      this.onChange('');
      this.valueChange.emit('');
    }
  }
}
