import {Component, effect, inject, Injector, input, OnInit, output, signal} from '@angular/core';
import {AccordionIconStyle, AccordionItem} from './accordion.types';
declare const bootstrap: any;

@Component({
  selector: 'lib-accordion',
  imports: [],
  templateUrl: './accordion.html',
  styleUrl: './accordion.css'
})
export class Accordion implements OnInit {
  private injector = inject(Injector);
  private collapseInstances = new Map<string, any>();

  items = input.required<AccordionItem[]>();
  accordionId = input<string>('accordion-' + Math.random().toString(36).substr(2, 9));
  iconStyle = input<AccordionIconStyle>('default');
  buttonSize = input<string>('');
  bodySize = input<string>('');

  itemToggled = output<{ id: string; expanded: boolean }>();

  expandedItems = signal<Set<string>>(new Set());

  ngOnInit(): void {
    effect(() => {
      const items = this.items();
      const expanded = new Set<string>();
      items.forEach(item => {
        if (item.expanded) {
          expanded.add(item.id);
        }
      });
      this.expandedItems.set(expanded);
    }, { injector: this.injector });
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  onToggle(itemId: string): void {
    const expanded = !this.isExpanded(itemId);

    this.expandedItems.update(set => {
      const newSet = new Set(set);
      if (expanded) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });

    this.itemToggled.emit({ id: itemId, expanded });
  }

  getAccordionClasses(): string {
    const classes = ['accordion'];
    if (this.iconStyle() === 'alt') {
      classes.push('accordion-alt-icon');
    }
    return classes.join(' ');
  }

  getButtonClasses(item: AccordionItem): string {
    const classes = ['accordion-button'];
    if (!this.isExpanded(item.id)) {
      classes.push('collapsed');
    }
    if (this.buttonSize()) {
      classes.push(this.buttonSize());
    }
    return classes.join(' ');
  }

  getBodyClasses(): string {
    const classes = ['accordion-body'];
    if (this.bodySize()) {
      classes.push(this.bodySize());
    }
    return classes.join(' ');
  }

  getCollapseClasses(item: AccordionItem): string {
    const classes = ['accordion-collapse', 'collapse'];
    if (this.isExpanded(item.id)) {
      classes.push('show');
    }
    return classes.join(' ');
  }
}
