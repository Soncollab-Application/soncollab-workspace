import { NgModule } from '@angular/core';
import {
  ChoiceLibModule,
  ConfirmDialogModule, DataCardModule,
  DataTableModule, EmptyStateModule,
  FilterBarModule,
  FormModalModule, KpiCardModule,
  ToastModule,
  ToastService
} from './modules';
import {
  AosService,
  FilterService, FilterStateService,
  LanguageOrchestratorService,
  LanguageService, ListStateManager, PermissionService,
  RecaptchaService, RelativeDateService,
  ThemeService, UrlStateService
} from './services';
import {RelativeDatePipe, TruncatePipe} from './pipes';
import {DropdownSingleDirective, HasPermissionDirective, TooltipDirective} from './directives';
import {Accordion, Alert, Badge} from './components';
import {CustomValidators} from './validators';

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
    FilterStateService,
    ListStateManager
  ],
  exports: [
    ToastModule,
    DataTableModule,
    FilterBarModule,
    ConfirmDialogModule,
    FormModalModule,
    EmptyStateModule,
    KpiCardModule,
    ChoiceLibModule,
    DataCardModule,
  ]
})
export class SharedLibModule { }
