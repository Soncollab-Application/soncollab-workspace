import { NgModule } from '@angular/core';
import {ChoicesModule} from './modules/choices/choices.module';
import {ToastModule} from './modules/toast/toast.module';
@NgModule({
  imports: [
    ChoicesModule,
    ToastModule
  ],
  exports: [
    ChoicesModule,
    ToastModule
  ]
})
export class SharedLibModule { }
