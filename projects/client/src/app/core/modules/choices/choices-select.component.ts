import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {ChoicesConfig, ChoicesDirective} from './choices.directive';
import {ThemeService} from '../../services/theme.service';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}

@Component({
  selector: 'app-choices-select',
  standalone: true,
  imports: [CommonModule, ChoicesDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChoicesSelectComponent),
      multi: true
    }
  ],
  template: `
    <select
      class="form-select"
      appChoices
      [choicesConfig]="finalConfig"
      [attr.aria-label]="ariaLabel"
      [attr.data-bs-theme]="currentTheme"
      (choicesChange)="onSelectionChange($event)">

      @for (option of options; track option.value) {
        <option
          [value]="option.value"
          [disabled]="option.disabled"
          [selected]="option.selected">
          {{ option.label }}
        </option>
      }
    </select>
  `
})
export class ChoicesSelectComponent implements OnInit, ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = '';
  @Input() choicesConfig: ChoicesConfig = {};
  @Input() ariaLabel: string = '';
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  @Input() searchEnabled: boolean = false;

  @Output() selectionChange = new EventEmitter<any>();

  private themeService = inject(ThemeService);
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private currentValue: any;

  finalConfig: ChoicesConfig = {};
  currentTheme: 'light' | 'dark' = 'light';

  ngOnInit(): void {
    // Déterminer le thème actuel
    this.updateCurrentTheme();

    this.finalConfig = {
      searchEnabled: this.searchEnabled,
      ...this.choicesConfig
    };

    // Écouter les changements de thème
    this.themeService.theme$.subscribe(() => {
      this.updateCurrentTheme();
    });
  }

  private updateCurrentTheme(): void {
    if (this.theme === 'auto') {
      this.currentTheme = this.themeService.isDarkTheme() ? 'dark' : 'light';
    } else {
      this.currentTheme = this.theme === 'dark' ? 'dark' : 'light';
    }
  }

  onSelectionChange(value: any): void {
    this.currentValue = value;
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.currentValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Géré par la directive
  }
}
