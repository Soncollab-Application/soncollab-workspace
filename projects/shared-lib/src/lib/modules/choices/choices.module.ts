import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChoicesSelectComponent } from './choices-select.component';
import { ChoicesDirective } from './choices.directive';

@NgModule({
  imports: [
    CommonModule,
    ChoicesSelectComponent,
    ChoicesDirective
  ],
  exports: [
    ChoicesSelectComponent,
    ChoicesDirective
  ]
})
export class ChoicesModule { }
