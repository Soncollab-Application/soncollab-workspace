import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {HeaderComponent} from './v1/components/header/header.component';
import {FooterComponent} from './v1/components/footer/footer.component';

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterOutlet,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './layout.component.html',
  standalone: true,
  styleUrl: './layout.component.css'
})
export class LayoutComponent {

}
