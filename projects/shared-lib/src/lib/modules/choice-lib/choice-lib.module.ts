import { NgModule } from '@angular/core';
import { ChoiceDirective } from './choice.directive';
import { ChoiceService } from './choice.service';
import { Choice } from './choice';

@NgModule({
  imports: [Choice, ChoiceDirective],
  exports: [Choice, ChoiceDirective],
  providers: [ChoiceService]
})
export class ChoiceLibModule {}
