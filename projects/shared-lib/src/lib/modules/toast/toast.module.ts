import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from './toast.service';

@NgModule({
  imports: [
    CommonModule,
    ToastContainerComponent
  ],
  exports: [
    ToastContainerComponent
  ],
  providers: [
    ToastService
  ]
})
export class ToastModule { }
