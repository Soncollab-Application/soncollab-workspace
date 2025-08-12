import {Component, inject, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

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
  contactModalService = inject(ContactModalService);
  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }


}
