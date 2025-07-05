import {Component, OnDestroy, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

@Component({
  selector: 'app-rights',
  imports: [
    TranslatePipe,
    RouterLink,
    PricingPreview
  ],
  templateUrl: './rights.component.html',
  styleUrl: './rights.component.css'
})
export class RightsComponent implements OnInit, OnDestroy {

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  ngOnDestroy(): void {

  }

}
