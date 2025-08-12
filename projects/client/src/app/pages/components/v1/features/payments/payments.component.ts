import {Component, inject, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-payments',
  imports: [
    TranslatePipe,
    RouterLink,
    PricingPreview
  ],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css'
})
export class PaymentsComponent implements OnInit {
  contactModalService = inject(ContactModalService);
  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }


}
