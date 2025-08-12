import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  forwardRef,
  Output,
  EventEmitter,
  AfterViewInit
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

declare const Choices: any;

export interface ChoicesConfig {
  searchEnabled?: boolean;
  allowHTML?: boolean;
  searchPlaceholderValue?: string;
  removeItemButton?: boolean;
  editItems?: boolean;
  shouldSort?: boolean;
  itemSelectText?: string;
  noResultsText?: string;
  noChoicesText?: string;
  classNames?: {
    containerInner?: string[] | string;
  };
  [key: string]: any;
}

@Directive({
  selector: '[appChoices]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChoicesDirective),
      multi: true
    }
  ]
})
export class ChoicesDirective implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor {
  @Input() choicesConfig: ChoicesConfig = {};
  @Output() choicesChange = new EventEmitter<any>();

  private choicesInstance: any;
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private initialValue: any;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // Rien ici, on attend AfterViewInit
  }

  ngAfterViewInit(): void {
    // Attendre que le DOM soit rendu et que les options soient là
    setTimeout(() => {
      this.initChoices();
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.choicesInstance) {
      try {
        this.choicesInstance.destroy();
      } catch (error) {
        console.error('Error destroying Choices:', error);
      }
    }
  }

  private initChoices(): void {
    const defaultConfig: ChoicesConfig = {
      allowHTML: true,
      searchPlaceholderValue: "Rechercher...",
      removeItemButton: true,
      editItems: true,
      searchEnabled: false,
      shouldSort: false,
      itemSelectText: "",
      noResultsText: "Aucun résultat trouvé",
      noChoicesText: "Aucun choix disponible",
      classNames: { containerInner: "form-select" }
    };

    const mergedConfig = { ...defaultConfig, ...this.choicesConfig };

    try {
      // Vérifier que l'élément a des options
      const options = this.elementRef.nativeElement.querySelectorAll('option');
      if (options.length === 0) {
        setTimeout(() => this.initChoices(), 100);
        return;
      }

      this.choicesInstance = new Choices(this.elementRef.nativeElement, mergedConfig);

      // Écouter les changements avec gestion d'erreur
      this.elementRef.nativeElement.addEventListener('change', this.handleChange.bind(this));

      // Appliquer la valeur initiale si elle existe
      if (this.initialValue !== undefined) {
        this.choicesInstance.setChoiceByValue(this.initialValue);
      }

    } catch (error) {
      console.error('Error initializing Choices:', error);
    }
  }

  private handleChange(event: any): void {
    try {
      if (!this.choicesInstance) return;

      const value = this.choicesInstance.getValue();

      let formValue;

      if (Array.isArray(value)) {
        // Multi-select
        formValue = value.map((v: any) => v && v.value !== undefined ? v.value : v);
      } else {
        // Single select
        if (value && value.value !== undefined) {
          formValue = value.value;
        } else if (typeof value === 'string' || typeof value === 'number') {
          formValue = value;
        } else {
          // Cas où la valeur est undefined ou null (suppression avec la croix)
          formValue = '';
        }
      }

      this.onChange(formValue);
      this.onTouched();
      this.choicesChange.emit(value);

    } catch (error) {
      // En cas d'erreur, on envoie une valeur vide
      this.onChange('');
      this.onTouched();
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.initialValue = value;

    if (this.choicesInstance && value !== undefined) {
      try {
        this.choicesInstance.setChoiceByValue(value);
      } catch (error) {
        console.error('Error setting value:', error);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.choicesInstance) {
      if (isDisabled) {
        this.choicesInstance.disable();
      } else {
        this.choicesInstance.enable();
      }
    }
  }
}
