import {Component, inject, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-distribution-delivery',
  imports: [
    RouterLink,
    TranslatePipe,
    PricingPreview
  ],
  templateUrl: './distribution-delivery.component.html',
  styleUrl: './distribution-delivery.component.css'
})
export class DistributionDeliveryComponent implements OnInit {
  contactModalService = inject(ContactModalService);
  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
