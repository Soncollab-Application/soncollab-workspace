import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

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

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
