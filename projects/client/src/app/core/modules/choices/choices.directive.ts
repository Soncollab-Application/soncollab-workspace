import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  forwardRef,
  Output,
  EventEmitter,
  AfterViewInit,
  OnChanges,
  SimpleChanges
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
  placeholderValue?: string;
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
export class ChoicesDirective implements OnInit, OnDestroy, AfterViewInit, OnChanges, ControlValueAccessor {
  @Input() choicesConfig: ChoicesConfig = {};
  @Output() choicesChange = new EventEmitter<any>();

  private choicesInstance: any;
  private onChange = (value: any) => {};
  private onTouched = () => {};
  private initialValue: any;
  private initialized = false;

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

  ngOnChanges(changes: SimpleChanges): void {
    // Si la configuration change et que Choices est initialisé, recréer l'instance
    if (changes['choicesConfig'] && this.initialized && !changes['choicesConfig'].firstChange) {
      this.recreateChoices();
    }
  }

  ngOnDestroy(): void {
    this.destroyChoices();
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

      // Détruire l'instance existante si elle existe
      this.destroyChoices();

      this.choicesInstance = new Choices(this.elementRef.nativeElement, mergedConfig);
      this.initialized = true;

      // Écouter les changements avec gestion d'erreur
      this.elementRef.nativeElement.addEventListener('change', this.handleChange.bind(this));

      // Appliquer la valeur initiale si elle existe
      if (this.initialValue !== undefined) {
        setTimeout(() => {
          if (this.choicesInstance) {
            this.choicesInstance.setChoiceByValue(this.initialValue);
          }
        }, 50);
      }

    } catch (error) {
      console.error('Error initializing Choices:', error);
    }
  }

  private recreateChoices(): void {
    if (this.initialized) {
      const currentValue = this.getCurrentValue();
      this.destroyChoices();
      setTimeout(() => {
        this.initChoices();
        if (currentValue !== undefined) {
          setTimeout(() => {
            if (this.choicesInstance) {
              this.choicesInstance.setChoiceByValue(currentValue);
            }
          }, 50);
        }
      }, 100);
    }
  }

  private getCurrentValue(): any {
    if (this.choicesInstance) {
      try {
        const value = this.choicesInstance.getValue();
        if (Array.isArray(value)) {
          return value.map((v: any) => v && v.value !== undefined ? v.value : v);
        } else {
          return value && value.value !== undefined ? value.value : value;
        }
      } catch (error) {
        return this.initialValue;
      }
    }
    return this.initialValue;
  }

  private destroyChoices(): void {
    if (this.choicesInstance) {
      try {
        this.choicesInstance.destroy();
      } catch (error) {
        console.error('Error destroying Choices:', error);
      }
      this.choicesInstance = null;
      this.initialized = false;
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
      this.choicesChange.emit(formValue);

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
        // Délai pour s'assurer que les options sont à jour
        setTimeout(() => {
          if (this.choicesInstance) {
            this.choicesInstance.setChoiceByValue(value);
          }
        }, 50);
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

  // Méthode publique pour forcer la reconstruction
  public forceUpdate(): void {
    this.recreateChoices();
  }
}
