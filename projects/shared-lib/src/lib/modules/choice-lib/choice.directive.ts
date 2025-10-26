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

  @Output() libAddItem = new EventEmitter<ChoiceEventDetail>();
  @Output() libRemoveItem = new EventEmitter<ChoiceEventDetail>();
  @Output() libHighlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() libUnhighlightItem = new EventEmitter<ChoiceEventDetail>();
  @Output() libChoice = new EventEmitter<ChoiceEventDetail>();
  @Output() libChange = new EventEmitter<any>();
  @Output() libSearch = new EventEmitter<{ value: string; resultCount?: number }>();
  @Output() libShowDropdown = new EventEmitter<void>();
  @Output() libHideDropdown = new EventEmitter<void>();
  @Output() libHighlightChoice = new EventEmitter<any>();

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
      this.libAddItem.emit(detail);
    });

    element.addEventListener('removeItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libRemoveItem.emit(detail);
    });

    element.addEventListener('highlightItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libHighlightItem.emit(detail);
    });

    element.addEventListener('unhighlightItem', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libUnhighlightItem.emit(detail);
    });

    element.addEventListener('choice', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libChoice.emit(detail);
    });

    element.addEventListener('search', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libSearch.emit(detail);
    });

    element.addEventListener('showDropdown', (event: Event) => {
      event.stopPropagation();
      this.libShowDropdown.emit();
    });

    element.addEventListener('hideDropdown', (event: Event) => {
      event.stopPropagation();
      this.libHideDropdown.emit();
    });

    element.addEventListener('highlightChoice', (event: Event) => {
      event.stopPropagation();
      const detail = (event as CustomEvent).detail;
      this.libHighlightChoice.emit(detail); // Renommé
    });
  }

  public getInstance(): any {
    return this.instance;
  }
}
