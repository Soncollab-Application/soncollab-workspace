import {Component, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

@Component({
  selector: 'app-royalties',
  imports: [
    TranslatePipe,
    RouterLink,
    PricingPreview
  ],
  templateUrl: './royalties.component.html',
  styleUrl: './royalties.component.css'
})
export class RoyaltiesComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
