import { NgModule } from '@angular/core';
import {ToastModule} from './modules/toast/toast.module';
import {
  AosService,
  FilterService, FilterStateService,
  LanguageOrchestratorService,
  LanguageService, PermissionService,
  RecaptchaService, RelativeDateService,
  ThemeService, UrlStateService
} from './services';
import {ToastService} from './modules/toast';
import {DataTableModule} from './modules/data-table';
import {FilterBarModule} from './modules/filter-bar';
import {ConfirmDialogModule} from './modules/confirm-dialog';
import {FormModalModule} from './modules/form-modal';
import {EmptyStateModule} from './modules/empty-state';
import {KpiCardModule} from './modules/kpi-card';
import {ChoiceLibModule} from './modules/choice-lib/choice-lib.module';
import {RelativeDatePipe} from './pipes/relative-date.pipe';
import {Accordion} from './components/accordion/accordion';
import {Alert} from './components/alert/alert';
import {Badge} from './components/badge/badge';
import {DropdownSingleDirective} from './directives/dropdown-single.directive';
import {HasPermissionDirective, TooltipDirective} from './directives';
import {TruncatePipe} from './pipes/truncate.pipe';
import {CustomValidators} from './validators/custom-validators';

@NgModule({
  imports: [
    ToastModule,
    RelativeDatePipe,
    DropdownSingleDirective,
    HasPermissionDirective,
    TooltipDirective,
    TruncatePipe,
    Accordion,
    Alert,
    Badge,
  ],
  providers: [
    LanguageService,
    LanguageOrchestratorService,
    ThemeService,
    RecaptchaService,
    ToastService,
    FilterService,
    AosService,
    PermissionService,
    UrlStateService,
    RelativeDateService,
    CustomValidators,
    FilterStateService
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
