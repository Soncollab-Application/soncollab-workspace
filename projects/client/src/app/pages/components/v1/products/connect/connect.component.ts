import {Component, inject, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {ContactModalService} from '../../../../../core/services/contact-modal.service';

@Component({
  selector: 'app-connect',
  imports: [
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './connect.component.html',
  styleUrl: './connect.component.css'
})
export class ConnectComponent implements OnInit {
  contactModalService = inject(ContactModalService);
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
