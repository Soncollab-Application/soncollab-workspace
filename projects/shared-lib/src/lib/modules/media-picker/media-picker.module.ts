import { NgModule } from '@angular/core';
import {MediaPicker} from './media-picker';

@NgModule({
  imports: [MediaPicker],
  exports:[MediaPicker]
})

export class MediaPickerModule { }
