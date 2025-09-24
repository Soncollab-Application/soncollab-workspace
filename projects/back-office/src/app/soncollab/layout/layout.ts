import { Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Content} from './components/content/content';

@Component({
  selector: 'app-layout',
  imports: [
    Content
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {

}
