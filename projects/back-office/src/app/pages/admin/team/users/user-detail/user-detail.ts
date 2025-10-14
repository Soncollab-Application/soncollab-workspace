import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {
  Badge,
  Choice,
  ConfirmDialogService,
  getUserInitials,
  LanguageOrchestratorService,
  PermissionService, RelativeDatePipe, ToastService,
} from "shared-lib";
import { AdminService } from "../../../../../core/services/admin/admin.service";
import {AuthService} from '../../../../../core/services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {UserListItem} from '../../../../../core/models/admin/user-list.model';
import {Subject, takeUntil} from 'rxjs';
import {environment} from '../../../../../../environments/environment';

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
  private translate = inject(TranslateService);
  private languageOrchestrator = inject(LanguageOrchestratorService);
  private permissionsService = inject(PermissionService);
  private fb = inject(FormBuilder);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);

  private destroy$ = new Subject<void>();
  private componentId = 'user-detail';

  user = signal<UserListItem | null>(null);
  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);

  userForm!: FormGroup;
  roles = signal<any[]>([]);

  currentUserId = computed(() => this.authService.currentUser?.documentId);
  canManageUsers = computed(() =>
    this.permissionsService.canUpdateUser()
  );

  isCurrentUser = computed(() => this.user()?.documentId === this.currentUserId());
  canEdit = computed(() => this.canManageUsers() && !this.isCurrentUser());

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
      confirmed: [true]
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
    const userName =  this.translate.instant('user-detail.title');
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

    this.adminService.updateUser(this.user()!.documentId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.patchForm(updated);
          this.isEditMode.set(false);
          this.userForm.disable();
          this.saving.set(false);
          this.toastService.showSuccess(
            this.translate.instant('user-detail.successUpdate'),
            {
              position: 'top-end',
              delay: 2000,
              autohide: true,
            }
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
      icon: 'unlock',
      iconClass: 'text-success'
    }).then((confirmed) => {
      if (confirmed) {
        this.adminService.unblockUser(this.user()!.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updated) => {
              this.user.set(updated);
              this.patchForm(updated);
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
}
