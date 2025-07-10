import {Component, OnInit} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';

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

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }


}
