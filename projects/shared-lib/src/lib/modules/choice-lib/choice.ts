import {
  AfterViewInit,
  Component,
  computed,
  effect,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  Output,
  signal,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ChoiceConfig, ChoiceEventDetail, ChoiceGroup, ChoiceOption } from './choice.types';
import { ChoiceDirective } from './choice.directive';

@Component({
  selector: 'lib-choice',
  standalone: true,
  imports: [FormsModule, ChoiceDirective],
  templateUrl: './choice.html',
  styleUrl: './choice.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Choice),
      multi: true
    }
  ]
})
export class Choice implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild(ChoiceDirective) choiceDirective!: ChoiceDirective;

  private _type = signal<'text' | 'select-one' | 'select-multiple'>('select-one');
  private _options = signal<ChoiceOption[]>([]);
  private _groups = signal<ChoiceGroup[]>([]);
  private _config = signal<ChoiceConfig>({});
  private _placeholder = signal<string>('');
  private _disabled = signal<boolean>(false);
  private _multiple = signal<boolean>(false);
  private _value = signal<any>(null);
  private _initialized = signal<boolean>(false);
  private _cssClass = signal<string>('form-select');
  private _pendingValue: any = null;
  private _isReady = signal<boolean>(false);

  @Input() set type(value: 'text' | 'select-one' | 'select-multiple') {
    this._type.set(value);
  }

  @Input() set options(value: ChoiceOption[]) {
    const hasChanged = JSON.stringify(this._options()) !== JSON.stringify(value);
    this._options.set(value);

    if (this._initialized() && hasChanged && value.length > 0) {
      this._isReady.set(false);
      setTimeout(() => {
        this.updateChoicesOptions();
        setTimeout(() => this._isReady.set(true), 100);
      }, 0);
    }
  }

  @Input() set groups(value: ChoiceGroup[]) {
    const hasChanged = JSON.stringify(this._groups()) !== JSON.stringify(value);
    this._groups.set(value);

    if (this._initialized() && hasChanged && value.length > 0) {
      this._isReady.set(false);
      setTimeout(() => {
        this.updateChoicesOptions();
        setTimeout(() => this._isReady.set(true), 100);
      }, 0);
    }
  }

  @Input() set config(value: ChoiceConfig) {
    this._config.set(value);
  }

  @Input() set placeholder(value: string) {
    this._placeholder.set(value);
  }

  @Input() set disabled(value: boolean) {
    this._disabled.set(value);
  }

  @Input() set multiple(value: boolean) {
    this._multiple.set(value);
  }

  @Input() set cssClass(value: string) {
    this._cssClass.set(value);
  }

  @Input() name = '';
  @Input() id = '';
  @Input() required = false;
  @Input() ariaLabel = '';

  @Output() valueChange = new EventEmitter<any>();
  @Output() addItem = new EventEmitter<ChoiceEventDetail>();
  @Output() removeItem = new EventEmitter<ChoiceEventDetail>();
  @Output() highlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() unhighlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() choice = new EventEmitter<ChoiceEventDetail>();
  @Output() change = new EventEmitter<any>();
  @Output() search = new EventEmitter<{ value: string; resultCount?: number }>();
  @Output() showDropdown = new EventEmitter<void>();
  @Output() hideDropdown = new EventEmitter<void>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private isInternalChange = false;
  private isExternalUpdate = false;

  private mergedConfig = computed<ChoiceConfig>(() => {
    const cssClasses = this._cssClass().split(' ').filter(c => c);
    return {
      placeholder: this._placeholder() !== '',
      placeholderValue: this._placeholder(),
      classNames: {
        containerInner: cssClasses,
        ...this._config().classNames
      },
      ...this._config()
    };
  });

  protected isText = computed(() => this._type() === 'text');
  protected isSelect = computed(() => this._type() === 'select-one' || this._type() === 'select-multiple');
  private isMultiple = computed(() => this._type() === 'select-multiple' || this._multiple());
  protected hasGroups = computed(() => this._groups().length > 0);

  protected get mergedConfigValue(): ChoiceConfig {
    return this.mergedConfig();
  }
  protected get placeholderValue(): string {
    return this._placeholder();
  }
  protected get disabledValue(): boolean {
    return this._disabled();
  }
  protected get isMultipleValue(): boolean {
    return this.isMultiple();
  }
  protected get cssClassValue(): string {
    return this._cssClass();
  }
  protected get optionsValue(): ChoiceOption[] {
    return this._options();
  }
  protected get groupsValue(): ChoiceGroup[] {
    return this._groups();
  }

  constructor() {
    effect(() => {
      const val = this._value();
      if (this._isReady() && this._initialized() && this.choiceDirective && !this.isInternalChange) {
        const instance = this.choiceDirective.getInstance();
        if (instance && val !== undefined && val !== null) {
          setTimeout(() => {
            instance.setChoiceByValue(Array.isArray(val) ? val : [val]);
          }, 50);
        }
      } else if (val !== undefined && val !== null) {
        this._pendingValue = val;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this._initialized.set(true);
      this.updateChoicesOptions();

      setTimeout(() => {
        this._isReady.set(true);

        if (this._pendingValue !== null) {
          const instance = this.choiceDirective?.getInstance();
          if (instance) {
            instance.setChoiceByValue(
              Array.isArray(this._pendingValue)
                ? this._pendingValue
                : [this._pendingValue]
            );
          }
          this._pendingValue = null;
        }
      }, 100);
    }, 0);
  }

  ngOnDestroy(): void {
    this._initialized.set(false);
    this._isReady.set(false);
  }

  private updateChoicesOptions(): void {
    const instance = this.choiceDirective?.getInstance();
    const options = this._options();
    const groups = this._groups();

    if (!instance || !this.isSelect()) return;

    instance.clearChoices();

    if (groups.length > 0) {
      const groupedChoices = groups.map(group => ({
        label: group.label,
        disabled: group.disabled || false,
        choices: group.choices.map(opt => ({
          value: opt.value,
          label: opt.label,
          selected: opt.selected || false,
          disabled: opt.disabled || false,
          customProperties: opt.customProperties
        }))
      }));
      instance.setChoices(groupedChoices, 'value', 'label', false);
    } else if (options.length > 0) {
      instance.setChoices(
        options.map(opt => ({
          value: opt.value,
          label: opt.label,
          selected: opt.selected || false,
          disabled: opt.disabled || false,
          placeholder: opt.placeholder || opt.value === '',
          customProperties: opt.customProperties
        })),
        'value',
        'label',
        false
      );
    }

    const val = this._value();
    if (val !== undefined && val !== null && val !== '') {
      setTimeout(() => {
        instance.setChoiceByValue(Array.isArray(val) ? val : [val]);
      }, 50);
    }
  }

  onAddItem(detail: ChoiceEventDetail): void {
    this.addItem.emit(detail);
    this.updateValue();
  }

  onRemoveItem(detail: ChoiceEventDetail): void {
    this.removeItem.emit(detail);
    this.updateValue();
  }

  private updateValue(): void {
    const instance = this.choiceDirective?.getInstance();
    if (instance && !this.isExternalUpdate) {
      this.isInternalChange = true;
      const currentValue = instance.getValue(true);

      let actualValue: any;
      if (Array.isArray(currentValue)) {
        actualValue = currentValue.length > 0 ? currentValue[0] : '';
      } else {
        actualValue = currentValue || '';
      }

      this._value.set(actualValue);
      this.valueChange.emit(actualValue);
      this.change.emit(actualValue);
      this.onChange(actualValue);
      this.onTouched();

      Promise.resolve().then(() => {
        this.isInternalChange = false;
      });
    }
  }

  writeValue(value: any): void {
    this.isExternalUpdate = true;
    this._value.set(value || '');
    this._pendingValue = value;
    Promise.resolve().then(() => {
      this.isExternalUpdate = false;
    });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  public getChoicesInstance(): any {
    return this.choiceDirective?.getInstance() || null;
  }

  public setValue(items: any[]): void {
    const instance = this.getChoicesInstance();
    if (instance) {
      instance.setValue(items);
      this.updateValue();
    }
  }

  public getValue(valueOnly = true): any {
    const instance = this.getChoicesInstance();
    return instance ? instance.getValue(valueOnly) : null;
  }

  public clearStore(): void {
    const instance = this.getChoicesInstance();
    if (instance) {
      instance.clearStore();
      this.updateValue();
    }
  }

  public disableChoice(): void {
    this._disabled.set(true);
  }

  public enableChoice(): void {
    this._disabled.set(false);
  }

  public setChoiceByValue(value: string | string[]): void {
    const instance = this.getChoicesInstance();
    if (instance) {
      instance.setChoiceByValue(value);
    }
  }
}
