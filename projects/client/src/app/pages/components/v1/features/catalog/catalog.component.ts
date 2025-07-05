import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import {LanguageService} from '../../../../../core/services/language.service';
import {PricingPreview} from '../../partials/pricing-preview/pricing-preview';

@Component({
  selector: 'app-catalog',
  imports: [TranslatePipe, RouterLink, PricingPreview],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit, OnDestroy {

  constructor() {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  ngOnDestroy(): void {

  }

}
