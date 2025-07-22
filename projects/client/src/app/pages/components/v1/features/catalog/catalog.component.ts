import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

@Component({
  selector: 'app-catalog',
  imports: [TranslatePipe, RouterLink, PricingPreview],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
