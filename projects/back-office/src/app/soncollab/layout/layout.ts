import {Component} from '@angular/core';
import {Content} from './components/content/content';
import {Aside} from './components/aside/aside';
import {Header} from './components/header/header';


@Component({
  selector: 'app-layout',
  imports: [
    Content,
    Aside,
    Header
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {

}
