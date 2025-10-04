import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from './toast';
import { ToastService } from './toast.service';

@NgModule({
  imports: [
    CommonModule,
    Toast
  ],
  exports: [
    Toast
  ],
  providers: [
    ToastService
  ]
})
export class ToastModule { }
