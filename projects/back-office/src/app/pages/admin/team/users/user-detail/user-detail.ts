import {Component, computed, inject, OnDestroy, OnInit, signal, ViewChild, ElementRef} from '@angular/core';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  Badge,
  Choice,
  ChoiceOption,
  ConfirmDialogService,
  getUserInitials,
  LanguageOrchestratorService,
  PermissionService,
  RelativeDatePipe,
  ToastService,
} from "shared-lib";
import { AdminService } from "../../../../../core/services/admin/admin.service";
import {AuthService} from '../../../../../core/services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {UserListItem} from '../../../../../core/models/admin/user-list.model';
import {Subject, takeUntil} from 'rxjs';
import {environment} from '../../../../../../environments/environment';
import {CustomPermission, CustomPermissions} from '../../../../../core/models/auth.model';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [Breadcrumb, TranslatePipe, ReactiveFormsModule, Choice, Badge, RelativeDatePipe],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css'
})
export class UserDetail implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionsService = inject(PermissionService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();
  private componentId = 'user-detail';

  @ViewChild('permissionsModal') permissionsModal!: ElementRef;

  user = signal<UserListItem | null>(null);
  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);

  userForm!: FormGroup;
  roles = signal<any[]>([]);

  availablePermissions = signal<CustomPermission[]>([]);
  permissionOptions = signal<ChoiceOption[]>([]);

  currentUserId = computed(() => this.authService.currentUser?.documentId);
  canManageUsers = computed(() =>
    this.permissionsService.canUpdateUser()
  );

  canViewQuotas = computed(() =>
    this.permissionsService.hasPermission('sales-quota', 'sales-quota', 'findOne')
  );

  isCurrentUser = computed(() => this.user()?.documentId === this.currentUserId());
  canEdit = computed(() => this.canManageUsers() && !this.isCurrentUser());

  showPermissionsSection = computed(() => {
    const user = this.user();
    if (!user?.role?.type) return false;
    return ['soncollab_sales', 'soncollab_content'].includes(user.role.type);
  });

  hasQuotas = computed(() => {
    const u = this.user();
    return u?.sales_quotas && u.sales_quotas.length > 0;
  });

  getActiveQuotas = computed(() => {
    const u = this.user();
    if (!u?.sales_quotas) return [];
    return u.sales_quotas.filter(q => q.is_active);
  });

  apiBaseUrl = environment.api.baseUrl;

  ngOnInit() {
    this.initForm();
    this.loadRoles();
    this.loadUser();
    this.languageOrchestrator.registerComponent(
      this.componentId,
      () => this.onLanguageChange()
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.languageOrchestrator.unregisterComponent(this.componentId);
    this.pageTitleService.resetBreadcrumbs();
  }

  private initForm() {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      first_name: [''],
      last_name: [''],
      phone: [''],
      bio: [''],
      role: [null, Validators.required],
      blocked: [false],
      confirmed: [true],
      custom_permissions: [[]]
    });

    this.userForm.disable();
  }

  private loadUser() {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (!documentId) {
      this.router.navigate(['/admin/team/users']);
      return;
    }

    this.loading.set(true);
    this.adminService.getUserByDocumentId(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          this.patchForm(user);
          this.setBreadcrumbs();
          this.updatePageTitle();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/admin/team/users']);
        }
      });
  }

  private loadRoles() {
    this.adminService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.roles.set(response.roles.filter((role: any) =>
            role.type !== 'public' && role.type !== 'authenticated'
          ));
        }
      });
  }

  private patchForm(user: UserListItem) {
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      bio: user.bio,
      role: user.role.id,
      blocked: user.blocked,
      confirmed: user.confirmed
    });

    this.loadPermissionsForRole(user.role.type);
    this.patchCustomPermissions(user);
  }

  private patchCustomPermissions(user: UserListItem) {
    if (!user.custom_permissions) return;

    if (user.custom_permissions['all']?.enabled) {
      const allPermissions = this.availablePermissions();
      this.userForm.patchValue({
        custom_permissions: allPermissions
      });
      return;
    }

    const enabledPermissions = Object.entries(user.custom_permissions)
      .filter(([_, value]) => value.enabled)
      .map(([key, _]) => key);

    this.userForm.patchValue({
      custom_permissions: enabledPermissions
    });
  }

  private loadPermissionsForRole(roleType: string) {
    const permissionsByRole: Record<string, CustomPermission[]> = {
      'soncollab_admin': ['all'],
      'soncollab_content': ['blog', 'help', 'newsletter', 'analytics_read'],
      'soncollab_sales': ['sales_contacts', 'sales_interactions', 'sales_quotas']
    };

    const permissions = permissionsByRole[roleType] || [];
    this.availablePermissions.set(permissions);

    if (permissions.includes('all')) {
      this.permissionOptions.set([]);
      return;
    }

    setTimeout(() => {
      const options: ChoiceOption[] = permissions.map(perm => ({
        value: perm,
        label: this.translate.instant(`invitations-list.invite.permissions_list.${perm}`) || this.formatPermissionLabel(perm),
        selected: false
      }));

      this.permissionOptions.set(options);
    }, 0);
  }

  private formatPermissionLabel(permission: string): string {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private buildCustomPermissions(selectedPermissions: string[]): Partial<CustomPermissions> {
    const permissions: Partial<CustomPermissions> = {};
    const available = this.availablePermissions();

    if (available.includes('all')) {
      permissions['all'] = { enabled: true };
      return permissions;
    }

    available.forEach(perm => {
      permissions[perm] = {
        enabled: selectedPermissions.includes(perm)
      };
    });

    return permissions;
  }

  getEnabledPermissions(): CustomPermission[] {
    const user = this.user();
    if (!user?.custom_permissions) return [];

    if (user.custom_permissions['all']?.enabled) return ['all'];

    return Object.entries(user.custom_permissions)
      .filter(([_, value]) => value.enabled)
      .map(([key, _]) => key as CustomPermission);
  }

  getAllPermissionsWithStatus(): Array<{key: string, enabled: boolean}> {
    const user = this.user();
    const available = this.availablePermissions();

    if (!user || available.includes('all')) {
      return [];
    }

    return available.map(perm => ({
      key: perm,
      enabled: user.custom_permissions?.[perm]?.enabled ?? false
    }));
  }

  showPermissionsModal() {
    const modalElement = this.permissionsModal.nativeElement;
    const modal = new (window as any).bootstrap.Modal(modalElement);
    modal.show();
  }

  closePermissionsModal() {
    const modalElement = this.permissionsModal.nativeElement;
    const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }

  togglePermission(permission: string) {
    const currentPermissions = this.userForm.value.custom_permissions || [];
    const index = currentPermissions.indexOf(permission);

    let updatedPermissions: string[];
    if (index > -1) {
      updatedPermissions = currentPermissions.filter((p: string) => p !== permission);
    } else {
      updatedPermissions = [...currentPermissions, permission];
    }

    this.userForm.patchValue({ custom_permissions: updatedPermissions });
  }

  savePermissions() {
    if (!this.user()) return;

    this.saving.set(true);
    const formData = this.userForm.getRawValue();

    const customPermissions = this.buildCustomPermissions(formData.custom_permissions);

    const updateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      blocked: formData.blocked,
      custom_permissions: customPermissions
    };

    this.adminService.updateUser(this.user()!.documentId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.patchForm(updated);
          this.saving.set(false);
          this.closePermissionsModal();
          this.toastService.showSuccess(
            this.translate.instant('user-detail.successUpdate')
          );
        },
        error: () => {
          this.saving.set(false);
        }
      });
  }

  private setBreadcrumbs() {
    const user = this.user();
    const userName = user ? this.getUserFullName(user) : '';

    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.users-list.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.users-list.team')
      },
      {
        label: this.translate.instant('breadcrumbs.users-list.users'),
        route: '/admin/team/users'
      },
      {
        label: userName || this.translate.instant('user-detail.title'),
        active: true
      }
    ]);
  }

  onLanguageChange() {
    setTimeout(() => {
      if (this.user()) {
        this.setBreadcrumbs();
        this.updatePageTitle();
      }
    }, 150);
  }

  private updatePageTitle() {
    const userName = this.translate.instant('user-detail.title');
    this.pageTitleService.setTitle(userName);
  }

  toggleEditMode() {
    this.isEditMode.update(v => !v);
    if (this.isEditMode()) {
      this.userForm.enable();
      this.userForm.get('email')?.disable();
      this.userForm.get('role')?.disable();
      this.userForm.get('confirmed')?.disable();
      this.userForm.get('username')?.disable();
      this.userForm.get('bio')?.disable();
    } else {
      this.userForm.disable();
      const user = this.user();
      if (user) this.patchForm(user);
    }
  }

  onSubmit() {
    if (!this.userForm.valid || !this.user()) return;

    this.saving.set(true);
    const formData = this.userForm.getRawValue();

    const customPermissions = this.buildCustomPermissions(formData.custom_permissions);

    const updateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      blocked: formData.blocked,
      custom_permissions: customPermissions
    };

    this.adminService.updateUser(this.user()!.documentId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.patchForm(updated);
          this.isEditMode.set(false);
          this.userForm.disable();
          this.saving.set(false);
          this.toastService.showSuccess(
            this.translate.instant('user-detail.successUpdate')
          );
        },
        error: () => {
          this.saving.set(false);
        }
      });
  }

  getRoleOptions() {
    return this.roles().map(role => ({
      value: role.id,
      label: this.translateRole(role.type),
      selected: role.id === this.user()?.role.id
    }));
  }

  blockUser() {
    if (!this.user()) return;

    const username = this.getUserFullName(this.user()!);
    const message = this.translate.instant('user-detail.confirmBlock', { name: username });

    this.confirmDialog.open({
      title: this.translate.instant('user-detail.blockTitle'),
      message: message,
      confirmText: this.translate.instant('users-list.actions.block'),
      confirmClass: 'btn-danger',
      icon: 'lock',
      iconClass: 'text-danger'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.blockUser(this.user()!.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updated) => {
              this.user.set(updated);
              this.patchForm(updated);
              this.toastService.showSuccess(
                this.translate.instant('user-detail.toast.block_success', { name: username })
              );
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('user-detail.toast.block_error', { name: username })
              );
            }
          });
      }
    });
  }

  unblockUser() {
    if (!this.user()) return;

    const username = this.getUserFullName(this.user()!);

    this.confirmDialog.open({
      title: this.translate.instant('user-detail.unblockTitle'),
      message: this.translate.instant('user-detail.confirmUnblock', { name: username }),
      confirmText: this.translate.instant('users-list.actions.unblock'),
      confirmClass: 'btn-success',
      icon: 'lock_open',
      iconClass: 'text-success'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.unblockUser(this.user()!.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updated) => {
              this.user.set(updated);
              this.patchForm(updated);
              this.toastService.showSuccess(
                this.translate.instant('user-detail.toast.unblock_success', { name: username })
              );
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('user-detail.toast.unblock_error', { name: username })
              );
            }
          });
      }
    });
  }

  getUserInitials(user: UserListItem): string {
    return getUserInitials(user);
  }

  getUserFullName(user: UserListItem): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email || '';
  }

  translateRole(roleType: string): string {
    const key = `users-list.roles.${roleType}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : roleType;
  }

  goBack() {
    this.router.navigate(['/admin/team/users']);
  }

  goToQuota(quotaDocumentId: string): void {
    this.router.navigate(['/admin/commercial/quotas', quotaDocumentId]);
  }

  getQuotaTypeBadge(type: string): string {
    return type === 'weekly' ? 'bg-primary-subtle text-primary' : 'bg-info-subtle text-info';
  }

  getQuotaStatusBadge(isActive: boolean): string {
    return isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary';
  }

  getUtilizationClass(quota: any): string {
    if (!quota.max_contacts) return 'bg-secondary';
    const percentage = Math.round((quota.current_contacts / quota.max_contacts) * 100);
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 75) return 'bg-warning';
    if (percentage >= 50) return 'bg-info';
    return 'bg-success';
  }

  getUtilizationPercentage(quota: any): number {
    if (!quota.max_contacts) return 0;
    return Math.round((quota.current_contacts / quota.max_contacts) * 100);
  }

}
