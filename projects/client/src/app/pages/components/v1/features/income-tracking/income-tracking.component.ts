import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

@Component({
  selector: 'app-income-tracking',
  imports: [
    RouterLink,
    TranslatePipe,
    PricingPreview
  ],
  templateUrl: './income-tracking.component.html',
  styleUrl: './income-tracking.component.css'
})
export class IncomeTrackingComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }


}
