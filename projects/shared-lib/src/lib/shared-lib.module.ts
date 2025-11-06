import { NgModule } from '@angular/core';
import {
  ChoiceLibModule,
  ConfirmDialogModule, DataListModule,
  EmptyStateModule,
  FilterBarModule,
  FormModalModule, KpiCardModule, ModalModule, ModalService, OffcanvasModule, OffcanvasService,
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
    ListStateManager,
    OffcanvasService,
    ModalService
  ],
  exports: [
    ToastModule,
    FilterBarModule,
    ConfirmDialogModule,
    FormModalModule,
    EmptyStateModule,
    KpiCardModule,
    ChoiceLibModule,
    DataListModule,
    OffcanvasModule,
    ModalModule
  ]
})
export class SharedLibModule { }
