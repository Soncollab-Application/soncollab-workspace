import {Directive, inject, Input, OnInit, TemplateRef, ViewContainerRef} from '@angular/core';
import {PermissionService} from '../services';

@Directive({
  selector: '[libHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit {
  @Input() hasPermission!: { plugin?: string; api?: string; controller: string; action: string };

  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    const hasAccess = this.hasPermission.plugin
      ? this.permissionService.hasPluginPermission(
        this.hasPermission.plugin,
        this.hasPermission.controller,
        this.hasPermission.action
      )
      : this.permissionService.hasPermission(
        this.hasPermission.api!,
        this.hasPermission.controller,
        this.hasPermission.action
      );

    this.viewContainer.clear();
    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
