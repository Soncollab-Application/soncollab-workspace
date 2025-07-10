import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';

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

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

}
