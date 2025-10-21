import {Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {AdminService} from '../../../services/admin/admin.service';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Choice, ChoiceOption, CustomValidators, LanguageService, ToastService} from 'shared-lib';
import {InviteOffcanvasService} from '../../../services/admin/invite-offcanvas.service';
import {
  Country,
  InviteRequest,
  RoleInfo, RolesData, RolesResponse,
  TargetRole,
  Territory
} from '../../../models/admin/invitation.model';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-invite-offcanvas',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    Choice
  ],
  templateUrl: './invite-offcanvas.html',
  styleUrl: './invite-offcanvas.css'
})
export class InviteOffcanvas implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private translate = inject(TranslateService);
  private toastService = inject(ToastService);
  private offcanvasService = inject(InviteOffcanvasService);
  private languageService = inject(LanguageService);

  private destroy$ = new Subject<void>();

  private readonly ALLOWED_ROLES: TargetRole[] = [
    'soncollab_admin',
    'soncollab_sales',
    'soncollab_content'
  ];

  inviteForm!: FormGroup;
  submitting = signal(false);
  loading = signal(false);

  availableRoles = signal<RoleInfo[]>([]);
  rolesData = signal<RolesData | null>(null);
  countries = signal<Country[]>([]);
  territories = signal<Territory[]>([]);

  selectedRole = signal<RoleInfo | null>(null);
  selectedTerritoryCode = signal<string | null>(null);

  isOpen = computed(() => this.offcanvasService.getState().isOpen);



  roleOptions = signal<ChoiceOption[]>([]);
  departmentOptions = signal<ChoiceOption[]>([]);
  languageOptions = signal<ChoiceOption[]>([]);
  countryOptions = signal<ChoiceOption[]>([]);
  territoryOptions = signal<ChoiceOption[]>([]);
  permissionOptions = signal<ChoiceOption[]>([]);

  showDepartment = computed(() => this.selectedRole()?.department_required ?? false);
  showTerritory = computed(() => this.selectedRole()?.territory_required ?? false);
  showCountry = computed(() => this.selectedRole()?.territory_required ?? false);
  showPermissions = computed(() => {
    const role = this.selectedRole();
    return role &&
      role.permissions &&
      role.permissions.length > 0 &&
      !role.permissions.includes('all') &&
      this.permissionOptions().length > 0;
  });

  permissionsConfig = computed(() => ({
    searchEnabled: false,
    shouldSort: false,
    removeItemButton: true,
    noResultsText: this.translate.instant('invitations-list.invite.no_permissions_available'),
    noChoicesText: this.translate.instant('invitations-list.invite.no_permissions_available'),
    itemSelectText: this.translate.instant('invitations-list.invite.select_permission'),
    classNames: { containerInner: ['form-select'] }
  }));

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.loadData();
        });
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupRoleChangeListener();
    this.setupTerritoryChangeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private initializeForm(): void {
    this.inviteForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, CustomValidators.email()]],
      target_role: ['', Validators.required],
      department: [''],
      territory: [''],
      target_country: [''],
      permissions: [],
      preferred_language: ['fr', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });

    this.languageOptions.set(
      this.languageService.getSupportedLanguages().map(lang => ({
        value: lang.code,
        label: lang.name
      }))
    );
  }

  private loadData(): void {
    this.loading.set(true);

    let rolesLoaded = false;
    let countriesLoaded = false;
    let territoriesLoaded = false;

    const checkAllLoaded = () => {
      if (rolesLoaded && countriesLoaded && territoriesLoaded) {
        this.loading.set(false);
      }
    };

    this.adminService.getAvailableRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: RolesResponse) => {
          this.rolesData.set(response.data);

          const filteredRoles = response.data.roles.filter(role =>
            this.ALLOWED_ROLES.includes(role.value as TargetRole)
          );

          this.availableRoles.set(filteredRoles);
          this.updateRoleOptions();
          rolesLoaded = true;
          checkAllLoaded();
        },
        error: (err) => {
          console.error('Error loading roles:', err);
          rolesLoaded = true;
          checkAllLoaded();
        }
      });

    this.adminService.getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.countries.set(response.data);
          this.updateCountryOptions();
          countriesLoaded = true;
          checkAllLoaded();
        },
        error: (err) => {
          console.error('Error loading countries:', err);
          countriesLoaded = true;
          checkAllLoaded();
        }
      });

    this.adminService.getTerritories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.territories.set(response.data);
          this.territoryOptions.set(
            response.data
              .filter(t => t.is_active)
              .map(territory => ({
                value: territory.territory_code,
                label: `${territory.territory_name} (${territory.territory_code})`
              }))
          );
          territoriesLoaded = true;
          checkAllLoaded();
        },
        error: (err) => {
          console.error('Error loading territories:', err);
          territoriesLoaded = true;
          checkAllLoaded();
        }
      });
  }

  private updateCountryOptions(territoryCode?: string): void {
    const allCountries = this.countries();
    let filteredCountries = allCountries.filter(c => c.is_active);

    if (territoryCode) {
      filteredCountries = filteredCountries.filter(
        c => c.sales_territory?.territory_code === territoryCode
      );
    }

    this.countryOptions.set(
      filteredCountries.map(country => ({
        value: country.code,
        label: `${country.flag || ''} ${country.name}`.trim()
      }))
    );
  }

  private updateRoleOptions(): void {
    this.roleOptions.set(
      this.availableRoles().map(role => ({
        value: role.value,
        label: role.label
      }))
    );
  }

  private setupRoleChangeListener(): void {
    this.inviteForm.get('target_role')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((roleValue: TargetRole) => {
        const role = this.availableRoles().find(r => r.value === roleValue);
        this.selectedRole.set(role || null);

        this.inviteForm.patchValue({
          department: '',
          territory: '',
          target_country: '',
          permissions: []
        }, { emitEvent: false });

        this.updateValidations(role);
        this.updateDepartmentOptionsForRole(roleValue);
        this.updatePermissionOptionsForRole(roleValue);
      });
  }

  private setupTerritoryChangeListener(): void {
    this.inviteForm.get('territory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((territoryCode: string) => {
        this.selectedTerritoryCode.set(territoryCode);

        this.inviteForm.patchValue({ target_country: '' }, { emitEvent: false });

        if (territoryCode) {
          this.updateCountryOptions(territoryCode);
        } else {
          this.updateCountryOptions();
        }
      });
  }

  private updateValidations(role: RoleInfo | undefined): void {
    const departmentControl = this.inviteForm.get('department');
    const territoryControl = this.inviteForm.get('territory');
    const countryControl = this.inviteForm.get('target_country');

    if (role?.department_required) {
      departmentControl?.setValidators([Validators.required]);
    } else {
      departmentControl?.clearValidators();
      this.departmentOptions.set([]);
    }

    if (role?.territory_required) {
      territoryControl?.setValidators([Validators.required]);
      countryControl?.setValidators([Validators.required]);
    } else {
      territoryControl?.clearValidators();
      countryControl?.clearValidators();
    }

    departmentControl?.updateValueAndValidity({ emitEvent: false });
    territoryControl?.updateValueAndValidity({ emitEvent: false });
    countryControl?.updateValueAndValidity({ emitEvent: false });
  }

  private updateDepartmentOptionsForRole(roleValue: TargetRole): void {
    const rolesData = this.rolesData();
    if (!rolesData) return;

    const role = rolesData.roles.find(r => r.value === roleValue);

    if (!role || !role.departments || role.departments.length === 0) {
      this.departmentOptions.set([]);
      return;
    }

    setTimeout(() => {
      this.departmentOptions.set(
        role.departments.map(deptKey => {
          const deptInfo = rolesData.departments[deptKey];
          return {
            value: deptKey,
            label: deptInfo ? deptInfo.label : deptKey
          };
        })
      );

      if (role.departments.length === 1) {
        this.inviteForm.patchValue({ department: role.departments[0] }, { emitEvent: false });
      }
    }, 0);
  }

  private updatePermissionOptionsForRole(roleValue: TargetRole): void {
    const rolesData = this.rolesData();
    if (!rolesData) return;

    const role = rolesData.roles.find(r => r.value === roleValue);

    if (!role || !role.permissions || role.permissions.length === 0 || role.permissions.includes('all')) {
      this.permissionOptions.set([]);
      return;
    }

    setTimeout(() => {
      this.permissionOptions.set(
        role.permissions.map(perm => ({
          value: perm,
          label: this.translate.instant(`invitations-list.invite.permissions_list.${perm}`) || this.formatPermissionLabel(perm),
          selected: true
        }))
      );
    }, 0);
  }

  private formatPermissionLabel(permission: string): string {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  onSubmit(): void {
    if (this.inviteForm.invalid || this.submitting()) return;

    this.submitting.set(true);

    const formData: InviteRequest = {
      email: this.inviteForm.value.email,
      first_name: this.inviteForm.value.first_name,
      last_name: this.inviteForm.value.last_name,
      target_role: this.inviteForm.value.target_role,
      preferred_language: this.inviteForm.value.preferred_language
    };

    if (this.inviteForm.value.department) {
      formData.department = this.inviteForm.value.department;
    }
    if (this.inviteForm.value.territory) {
      formData.territory = this.inviteForm.value.territory;
    }
    if (this.inviteForm.value.target_country) {
      formData.target_country = this.inviteForm.value.target_country;
    }

    // Construction de l'objet permissions avec enabled: true/false
    const role = this.selectedRole();
    if (role && role.permissions && role.permissions.length > 0 && !role.permissions.includes('all')) {
      let selectedPermissions: any = this.inviteForm.value.permissions || [];

      if (typeof selectedPermissions === 'string') {
        selectedPermissions = selectedPermissions.split(',').map((p: string) => p.trim());
      }

      if (!Array.isArray(selectedPermissions)) {
        selectedPermissions = [];
      }

      const permissionsObject: Record<string, { enabled: boolean }> = {};

      role.permissions.forEach(perm => {
        const isEnabled = selectedPermissions.includes(perm);
        permissionsObject[perm] = {
          enabled: isEnabled
        };
      });

      formData.permissions = permissionsObject;
    }

    if (this.inviteForm.value.notes) {
      formData.notes = this.inviteForm.value.notes;
    }

    this.adminService.inviteMember(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('invitations-list.invite.success.title'),
            this.translate.instant('invitations-list.invite.success.message', {
              name: `${formData.first_name} ${formData.last_name}`
            })
          );

          const state = this.offcanvasService.getState();
          if (state.onSuccess) {
            state.onSuccess();
          }

          this.close();
          this.submitting.set(false);
        },
        error: (err) => {
          console.error('Error sending invitation:', err);
          this.toastService.showError(
            this.translate.instant('invitations-list.invite.error.title'),
            this.translate.instant('invitations-list.invite.error.message')
          );
          this.submitting.set(false);
        }
      });
  }

  close(): void {
    this.offcanvasService.close();
    this.inviteForm.reset({ preferred_language: 'fr' });
    this.selectedRole.set(null);
    this.selectedTerritoryCode.set(null);
  }

  getRoleIcon(role: TargetRole): string {
    const icons: Record<string, string> = {
      'soncollab_admin': 'admin_panel_settings',
      'soncollab_sales': 'trending_up',
      'soncollab_content': 'edit_note'
    };
    return icons[role] || 'person';
  }

  getRoleColor(role: TargetRole): string {
    const colors: Record<string, string> = {
      'soncollab_admin': 'danger',
      'soncollab_sales': 'success',
      'soncollab_content': 'primary'
    };
    return colors[role] || 'secondary';
  }
}
