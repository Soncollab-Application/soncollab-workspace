import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ChoiceDirective} from './choice.directive';
import {ChoiceService} from './choice.service';
import {Choice} from './choice';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    Choice,
    ChoiceDirective
  ],
  exports: [
    Choice,
    ChoiceDirective
  ],
  providers: [ChoiceService]
})
export class ChoiceLibModule {}
