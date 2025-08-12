import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ContactModalService} from '../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-pricing',
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
  contactModalService = inject(ContactModalService);
  constructor() {}

  ngOnInit(): void {
    window.scroll(0, 0);
  }


}
