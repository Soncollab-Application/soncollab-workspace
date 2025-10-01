import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input, OnChanges,
  OnDestroy,
  OnInit,
  Output, SimpleChanges
} from '@angular/core';
import {ChoiceService} from './choice.service';
import {ChoiceConfig, ChoiceEventDetail } from './choice.types';

@Directive({
  selector: '[libChoice]',
  standalone: true
})
export class ChoiceDirective implements OnInit, OnDestroy, OnChanges {
  private elementRef = inject(ElementRef);
  private choiceService = inject(ChoiceService);

  private instance: any = null;
  private instanceId = `choice-${Math.random().toString(36).substring(2, 9)}`;

  @Input() config: ChoiceConfig = {};
  @Input() disabled: boolean = false;

  @Output() addItem = new EventEmitter<ChoiceEventDetail>();
  @Output() removeItem = new EventEmitter<ChoiceEventDetail>();
  @Output() highlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() unhighlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() choice = new EventEmitter<ChoiceEventDetail>();
  @Output() change = new EventEmitter<any>();
  @Output() search = new EventEmitter<{ value: string; resultCount?: number }>();
  @Output() showDropdown = new EventEmitter<void>();
  @Output() hideDropdown = new EventEmitter<void>();
  @Output() highlightChoice = new EventEmitter<any>();

  ngOnInit(): void {
    if (this.instance) {
      this.instance.destroy();
    }
    this.initializeChoices();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.instance && !changes['disabled'].firstChange) {
      if (this.disabled) {
        this.instance.disable();
      } else {
        this.instance.enable();
      }
    }
  }

  ngOnDestroy(): void {
    this.choiceService.destroyInstance(this.instanceId);
    this.instance = null;
  }

  private initializeChoices(): void {
    const element = this.elementRef.nativeElement;

    const instance = this.choiceService.createInstance(element, this.config);
    this.instance = instance;
    this.choiceService.registerInstance(this.instanceId, instance);

    this.setupEventListeners(element);

    if (this.disabled) {
      this.instance.disable();
    }
  }

  private setupEventListeners(element: HTMLElement): void {
    element.addEventListener('change', (event: Event) => {
      event.stopPropagation();
      event.preventDefault();
    }, true);

    element.addEventListener('addItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.addItem.emit(detail);
      this.emitChangeEvent();
    });

    element.addEventListener('removeItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.removeItem.emit(detail);
      this.emitChangeEvent();
    });

    element.addEventListener('highlightItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.highlightItem.emit(detail);
    });

    element.addEventListener('unhighlightItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.unhighlightItem.emit(detail);
    });

    element.addEventListener('choice', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.choice.emit(detail);
    });

    element.addEventListener('search', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.search.emit(detail);
    });

    element.addEventListener('showDropdown', (event: Event) => {
      event.stopPropagation();
      this.showDropdown.emit();
    });

    element.addEventListener('hideDropdown', (event: Event) => {
      event.stopPropagation();
      this.hideDropdown.emit();
    });

    element.addEventListener('highlightChoice', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.highlightChoice.emit(detail);
    });
  }

  private emitChangeEvent(): void {
    if (this.instance) {
      const value = this.instance.getValue(true);
      this.change.emit(value);
    }
  }

  public getInstance(): any {
    return this.instance;
  }
}
