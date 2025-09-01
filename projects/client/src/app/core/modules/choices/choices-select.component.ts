// Fichier : projects/client/src/app/core/modules/choices/choices-select.component.ts

import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  inject,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChoicesConfig, ChoicesDirective } from './choices.directive';
import { ThemeService } from '../../services/theme.service';
import { Subject, takeUntil } from 'rxjs';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  icon?: string;
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
      @if (iconPosition && currentIcon) {
        <i class="{{currentIcon}} position-absolute top-50 translate-middle-y"
           [class.start-0]="iconPosition === 'start'"
           [class.end-0]="iconPosition === 'end'"
           [class.ms-3]="iconPosition === 'start'"
           [class.me-3]="iconPosition === 'end'"
           style="z-index: 10; pointer-events: none;"></i>
      }
      <select
        #choicesSelect
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
    </div>
  `
})
export class ChoicesSelectComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() choicesConfig: ChoicesConfig = {};
  @Input() ariaLabel: string = '';
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  @Input() searchEnabled: boolean = false;
  @Input() iconPosition: 'start' | 'end' | null = null;
  @Input() staticIcon: string = '';
  @Input() transparent: boolean = false;
  @Input() dynamicIcon: boolean = false;
  @Output() selectionChange = new EventEmitter<any>();

  @ViewChild(ChoicesDirective, { static: true })
  private choicesDirective!: ChoicesDirective;

  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private currentValue: any;

  finalConfig: ChoicesConfig = {};
  currentTheme: 'light' | 'dark' = 'light';
  currentIcon: string = '';

  ngOnInit(): void {
    this.updateCurrentTheme();
    this.initializeIcon();
    this.updateFinalConfig();

    // Écouter les changements de thème
    this.themeService.theme$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateCurrentTheme();
    });
  }

  ngAfterViewInit(): void {
    // S'assurer que la valeur initiale est bien appliquée après l'init de Choices.js
    if (this.currentValue !== undefined) {
      setTimeout(() => {
        this.choicesDirective?.writeValue(this.currentValue);
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    let needsUpdate = false;

    // Vérifier si les options ont changé
    if (changes['options'] && !changes['options'].firstChange) {
      needsUpdate = true;
    }

    // Vérifier si la configuration a changé
    if (changes['choicesConfig'] && !changes['choicesConfig'].firstChange) {
      this.updateFinalConfig();
      needsUpdate = true;
    }

    // Vérifier si d'autres propriétés importantes ont changé
    if (changes['searchEnabled'] && !changes['searchEnabled'].firstChange) {
      this.updateFinalConfig();
      needsUpdate = true;
    }

    // Forcer la mise à jour si nécessaire
    if (needsUpdate && this.choicesDirective) {
      setTimeout(() => {
        this.forceChoicesUpdate();
      }, 50);
    }

    // Mettre à jour l'icône dynamique si nécessaire
    if (changes['options'] && this.dynamicIcon) {
      this.updateDynamicIcon();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateCurrentTheme(): void {
    if (this.theme === 'auto') {
      this.currentTheme = this.themeService.isDarkTheme() ? 'dark' : 'light';
    } else {
      this.currentTheme = this.theme;
    }
  }

  private updateFinalConfig(): void {
    this.finalConfig = {
      searchEnabled: this.searchEnabled,
      ...this.choicesConfig
    };
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

    const selectedOption = this.options.find(opt =>
      opt.value === this.currentValue || opt.selected
    );

    if (selectedOption?.icon) {
      this.currentIcon = selectedOption.icon;
    } else {
      // Fallback à la première option avec une icône
      const firstOptionWithIcon = this.options.find(opt => opt.icon);
      this.currentIcon = firstOptionWithIcon?.icon ?? '';
    }
  }

  private forceChoicesUpdate(): void {
    if (this.choicesDirective && typeof this.choicesDirective.forceUpdate === 'function') {
      this.choicesDirective.forceUpdate();

      // Réappliquer la valeur après la mise à jour
      if (this.currentValue !== undefined) {
        setTimeout(() => {
          this.choicesDirective.writeValue(this.currentValue);
        }, 100);
      }
    }
  }

  public onSelectionChange(value: any): void {
    this.currentValue = value;

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

    if (this.dynamicIcon) {
      this.updateDynamicIcon();
    }

    if (this.choicesDirective) {
      this.choicesDirective.writeValue(value);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.choicesDirective) {
      this.choicesDirective.setDisabledState(isDisabled);
    }
  }

  // Méthode publique pour forcer la mise à jour
  public forceUpdate(): void {
    this.forceChoicesUpdate();
  }
}
