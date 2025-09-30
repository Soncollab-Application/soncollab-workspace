import {Directive, inject, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';

export interface PermissionService {
  hasPermission(permission: string | string[]): boolean;
  permissions$?: Subject<string[]>;
}

@Directive({
  selector: '[libHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private destroy$ = new Subject<void>();

  private permissions: string | string[] = [];
  private permissionService?: PermissionService;

  @Input() set libHasPermission(permissions: string | string[]) {
    this.permissions = permissions;
    this.updateView();
  }

  @Input() set libHasPermissionService(service: PermissionService) {
    this.permissionService = service;
    this.updateView();
  }

  ngOnInit(): void {
    if (this.permissionService?.permissions$) {
      this.permissionService.permissions$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateView());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    this.viewContainer.clear();

    if (this.permissionService && this.permissionService.hasPermission(this.permissions)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
