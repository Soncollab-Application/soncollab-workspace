import { Component } from '@angular/core';
import {Breadcrumb} from '../../../core/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-media-library',
  standalone: true,
  imports: [
    Breadcrumb,
  ],
  templateUrl: './media-library.html',
  styleUrl: './media-library.css',
})
export class MediaLibrary {

}
