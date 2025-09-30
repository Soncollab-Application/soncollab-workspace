import { NgModule } from '@angular/core';
import {ChoicesModule} from './modules/choices/choices.module';
import {ToastModule} from './modules/toast/toast.module';
import {LanguageOrchestratorService, LanguageService, RecaptchaService, ThemeService} from './services';
import {ToastService} from './modules/toast';
import {FilterService} from './services/filter.service';
import {DataTableModule} from './modules/data-table';
import {FilterBarModule} from './modules/filter-bar';
import {ConfirmDialogModule} from './modules/confirm-dialog';
import {FormModalModule} from './modules/form-modal';
import {EmptyStateModule} from './modules/empty-state';
import {KpiCardModule} from './modules/kpi-card';
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
    ToastService,
    FilterService
  ],
  exports: [
    ChoicesModule,
    ToastModule,
    DataTableModule,
    FilterBarModule,
    ConfirmDialogModule,
    FormModalModule,
    EmptyStateModule,
    KpiCardModule
  ]
})
export class SharedLibModule { }
