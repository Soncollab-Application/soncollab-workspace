import { NgModule } from '@angular/core';
import {ChoicesModule} from './modules/choices/choices.module';
import {ToastModule} from './modules/toast/toast.module';
import {LanguageOrchestratorService, LanguageService, RecaptchaService, ThemeService} from './services';
import {ToastService} from './modules/toast';
@NgModule({
  imports: [
    ChoicesModule,
    ToastModule
  ],
  providers: [
    LanguageService,
    LanguageOrchestratorService,
    ThemeService,
    RecaptchaService,
    ToastService
  ],
  exports: [
    ChoicesModule,
    ToastModule
  ]
})
export class SharedLibModule { }
