import { NgModule } from '@angular/core';
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
import {ChoiceLibModule} from './modules/choice-lib/choice-lib.module';
@NgModule({
  imports: [
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
    ToastModule,
    DataTableModule,
    FilterBarModule,
    ConfirmDialogModule,
    FormModalModule,
    EmptyStateModule,
    KpiCardModule,
    ChoiceLibModule
  ]
})
export class SharedLibModule { }
