import {Component, computed, effect, inject, OnDestroy, OnInit, signal, viewChild} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AdminService} from '../../../services/admin/admin.service';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Choice, ChoiceOption, LanguageService, ToastService} from 'shared-lib';
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

  // Rôles autorisés pour l'invitation
  private readonly ALLOWED_ROLES: TargetRole[] = [
    'soncollab_admin',
    'soncollab_sales',
    'soncollab_content'
  ];

  inviteForm!: FormGroup;
  submitting = signal(false);

  availableRoles = signal<RoleInfo[]>([]);
  rolesData = signal<RolesData | null>(null);
  countries = signal<Country[]>([]);
  territories = signal<Territory[]>([]);

  selectedRole = signal<RoleInfo | null>(null);

  isOpen = computed(() => this.offcanvasService.getState().isOpen);

  roleOptions = signal<ChoiceOption[]>([]);
  departmentOptions = signal<ChoiceOption[]>([]);
  languageOptions = signal<ChoiceOption[]>([]);
  countryOptions = signal<ChoiceOption[]>([]);
  territoryOptions = signal<ChoiceOption[]>([]);

  // Computed
  showDepartment = computed(() => this.selectedRole()?.department_required ?? false);
  showTerritory = computed(() => this.selectedRole()?.territory_required ?? false);
  showCountry = computed(() => this.selectedRole()?.territory_required ?? false);

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
    this.setupRoleChangeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.inviteForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      target_role: ['', Validators.required],
      department: [''],
      territory: [''],
      target_country: [''],
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
    // Load roles
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
        },
        error: (err) => console.error('Error loading roles:', err)
      });

    // Load countries
    this.adminService.getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.countries.set(response.data);
          this.countryOptions.set(
            response.data
              .filter(c => c.is_active)
              .map(country => ({
                value: country.id.toString(),
                label: `${country.flag || ''} ${country.name}`.trim()
              }))
          );
        },
        error: (err) => console.error('Error loading countries:', err)
      });

    // Load territories
    this.adminService.getTerritories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.territories.set(response.data);
          this.territoryOptions.set(
            response.data
              .filter(t => t.is_active)
              .map(territory => ({
                value: territory.id.toString(),
                label: `${territory.territory_name} (${territory.territory_code})`
              }))
          );
        },
        error: (err) => console.error('Error loading territories:', err)
      });
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

        // Reset champs conditionnels
        this.inviteForm.patchValue({
          department: '',
          territory: '',
          target_country: ''
        }, { emitEvent: false });

        // Configurer validations selon le rôle
        this.updateValidations(role);
      });
  }

  private updateValidations(role: RoleInfo | undefined): void {
    const departmentControl = this.inviteForm.get('department');
    const territoryControl = this.inviteForm.get('territory');
    const countryControl = this.inviteForm.get('target_country');

    // Reset validators
    departmentControl?.clearValidators();
    territoryControl?.clearValidators();
    countryControl?.clearValidators();

    if (role) {
      // Department
      if (role.department_required) {
        departmentControl?.setValidators(Validators.required);
        this.updateDepartmentOptions(role.value);
      }

      // Territory ou Country (au moins un requis)
      if (role.territory_required) {
        territoryControl?.setValidators(this.atLeastOneValidator.bind(this));
        countryControl?.setValidators(this.atLeastOneValidator.bind(this));
      }
    }

    departmentControl?.updateValueAndValidity();
    territoryControl?.updateValueAndValidity();
    countryControl?.updateValueAndValidity();
  }

  private atLeastOneValidator(control: any): { [key: string]: any } | null {
    const territory = this.inviteForm?.get('territory')?.value;
    const country = this.inviteForm?.get('target_country')?.value;

    if (!territory && !country) {
      return { atLeastOne: true };
    }
    return null;
  }

  private updateDepartmentOptions(roleValue: TargetRole): void {
    const role = this.availableRoles().find(r => r.value === roleValue);
    if (!role) return;

    const rolesData = this.rolesData();
    if (!rolesData) return;

    // Créer les options de département basées sur role.departments
    this.departmentOptions.set(
      role.departments.map(deptKey => {
        const deptInfo = rolesData.departments[deptKey];
        return {
          value: deptKey,
          label: deptInfo ? deptInfo.label : deptKey
        };
      })
    );

    // Auto-sélectionner si un seul département disponible
    if (role.departments.length === 1) {
      this.inviteForm.patchValue({ department: role.departments[0] }, { emitEvent: false });
    }
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

    // Ajouter champs conditionnels
    if (this.inviteForm.value.department) {
      formData.department = this.inviteForm.value.department;
    }
    if (this.inviteForm.value.territory) {
      formData.territory = parseInt(this.inviteForm.value.territory);
    }
    if (this.inviteForm.value.target_country) {
      formData.target_country = parseInt(this.inviteForm.value.target_country);
    }
    if (this.inviteForm.value.notes) {
      formData.notes = this.inviteForm.value.notes;
    }

    this.adminService.inviteMember(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('invite.success.title'),
            this.translate.instant('invite.success.message', {
              name: `${formData.first_name} ${formData.last_name}`
            })
          );

          const state = this.offcanvasService.getState();
          if (state.onSuccess) {
            state.onSuccess();
          }

          this.close();
          this.inviteForm.reset({ preferred_language: 'fr' });
          this.submitting.set(false);
        },
        error: (err) => {
          console.error('Error sending invitation:', err);
          this.toastService.showError(
            this.translate.instant('invite.error.title'),
            this.translate.instant('invite.error.message')
          );
          this.submitting.set(false);
        }
      });
  }

  close(): void {
    this.offcanvasService.close();
    this.inviteForm.reset();
  }

  getRoleIcon(role: TargetRole): string {
    const icons: Record<string, string> = {
      'soncollab_admin': 'shield-check',
      'soncollab_sales': 'graph-up-arrow',
      'soncollab_content': 'pencil-square'
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
