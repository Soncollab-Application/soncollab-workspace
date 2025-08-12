import {Component, inject, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {NgClass} from '@angular/common';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-pricing-preview',
  imports: [
    TranslatePipe,
    RouterLink,
    NgClass
  ],
  templateUrl: './pricing-preview.html',
  styleUrl: './pricing-preview.css'
})
export class PricingPreview {
  @Input() featureContext: string = 'catalog';
  @Input() backgroundClass: string = 'bg-semi-dark';
  contactModalService = inject(ContactModalService);
  constructor() {}

  getTranslationKey(key: string): string {
    return `pricing.${this.featureContext}.${key}`;
  }
}
