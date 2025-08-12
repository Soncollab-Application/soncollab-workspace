import {Component, inject, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-studio',
  imports: [
    TranslatePipe,
    RouterLink
  ],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.css'
})
export class StudioComponent implements OnInit {
  contactModalService = inject(ContactModalService);
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }


}
