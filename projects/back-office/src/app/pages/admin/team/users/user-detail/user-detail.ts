import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Breadcrumb} from '../../../../../core/components/breadcrumb/breadcrumb';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {DatePipe, NgClass} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subject, takeUntil} from 'rxjs';
import {UserListItem} from '../../../../../core/models/admin/user-list.model';
import {AdminService} from '../../../../../core/services/admin/admin.service';
import {AuthService} from '../../../../../core/services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {PageTitleService} from '../../../../../core/services/page-title.service';
import {Choice, LanguageOrchestratorService, PermissionService, getUserInitials} from 'shared-lib';
import {environment} from '../../../../../../environments/environment';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [Breadcrumb, TranslatePipe, DatePipe, NgClass, ReactiveFormsModule, Choice],
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

    if (confirm(message)) {
      this.adminService.blockUser(this.user()!.documentId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.user.set(updated);
            this.patchForm(updated);
          }
        });
    }
  }

  unblockUser() {
    if (!this.user()) return;

    this.adminService.unblockUser(this.user()!.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.patchForm(updated);
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
