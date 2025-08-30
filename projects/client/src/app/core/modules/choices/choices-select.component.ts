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
  icon?: string; // Nouvelle propriété pour l'icône
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
    <div class="position-relative">
      <select
        class="form-select"
        [class.form-icon-start]="iconPosition === 'start'"
        [class.form-icon-end]="iconPosition === 'end'"
        [class.bg-transparent]="transparent"
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

      <!-- Icône positionnée après le select pour s'afficher au-dessus de Choices.js -->
      @if (iconPosition && currentIcon) {
        <i class="{{currentIcon}} position-absolute top-50 translate-middle-y"
           [class.start-0]="iconPosition === 'start'"
           [class.end-0]="iconPosition === 'end'"
           [class.ms-3]="iconPosition === 'start'"
           [class.me-3]="iconPosition === 'end'"
           style="z-index: 10; pointer-events: none;"></i>
      }
    </div>
  `
})
export class ChoicesSelectComponent implements OnInit, ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = '';
  @Input() choicesConfig: ChoicesConfig = {};
  @Input() ariaLabel: string = '';
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  @Input() searchEnabled: boolean = false;

  // Nouvelles propriétés pour les icônes
  @Input() iconPosition: 'start' | 'end' | null = null;
  @Input() staticIcon: string = '';
  @Input() transparent: boolean = false;
  @Input() dynamicIcon: boolean = false;

  @Output() selectionChange = new EventEmitter<any>();

  private themeService = inject(ThemeService);
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private currentValue: any;

  finalConfig: ChoicesConfig = {};
  currentTheme: 'light' | 'dark' = 'light';
  currentIcon: string = '';

  ngOnInit(): void {
    // Déterminer le thème actuel
    this.updateCurrentTheme();

    // Initialiser l'icône
    this.initializeIcon();

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

  private initializeIcon(): void {
    if (this.staticIcon) {
      this.currentIcon = this.staticIcon;
    } else if (this.dynamicIcon) {
      this.updateDynamicIcon();
    }
  }

  private updateDynamicIcon(): void {
    if (!this.dynamicIcon) return;

    // Trouver l'option sélectionnée
    const selectedOption = this.options.find(option =>
      option.value === this.currentValue || option.selected
    );

    if (selectedOption?.icon) {
      this.currentIcon = selectedOption.icon;
    } else {
      // Icône par défaut ou première option avec icône
      const firstOptionWithIcon = this.options.find(option => option.icon);
      this.currentIcon = firstOptionWithIcon?.icon || '';
    }
  }

  onSelectionChange(value: any): void {
    this.currentValue = value;

    // Mettre à jour l'icône dynamique si activée
    if (this.dynamicIcon) {
      this.updateDynamicIcon();
    }

    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value);
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.currentValue = value;

    // Mettre à jour l'icône dynamique si activée
    if (this.dynamicIcon) {
      this.updateDynamicIcon();
    }
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
