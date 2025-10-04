# Système de Gestion des Permissions - Documentation Complète

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Installation et Configuration](#installation-et-configuration)
- [Utilisation](#utilisation)
- [API Reference](#api-reference)
- [Exemples détaillés](#exemples-détaillés)
- [Internationalisation](#internationalisation)
- [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Ce système de gestion de permissions permet de contrôler l'accès aux routes et fonctionnalités de l'application en fonction des permissions définies dans Strapi (users-permissions plugin).

### Fonctionnalités

- ✅ Chargement automatique des permissions au démarrage
- ✅ Guards pour protéger les routes avec toast de notification
- ✅ Support de permissions multiples (AND/OR)
- ✅ Vérifications dans les composants
- ✅ Directive pour masquer des éléments
- ✅ Configuration centralisée
- ✅ Toast personnalisable avec i18n
- ✅ Pas de redirection, meilleure UX

---

## Installation et Configuration

### 1. Structure des fichiers

```
libs/shared-lib/src/lib/
├── config/
│   └── permission.config.ts
├── models/
│   └── permission.models.ts
├── services/
│   └── permission.service.ts
├── guards/
│   └── permission.guard.ts
├── directives/
│   └── has-permission.directive.ts
└── tokens/
    └── toast.token.ts
```

### 2. Configuration de l'application

**`apps/back-office/src/app/app.config.ts`**

```typescript
import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer
} from '@angular/core';
import { filter, of, switchMap, take, firstValueFrom } from 'rxjs';
import { PERMISSION_CONFIG, PermissionService, TOAST_SERVICE } from 'shared-lib';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... autres providers
    
    {
      provide: PERMISSION_CONFIG,
      useValue: {
        endpoint: environment.api.fullUrl,
        roleId: 0,
        authUrl: '/auth/login'
      }
    },
    
    {
      provide: TOAST_SERVICE,
      useExisting: ToastService
    },
    
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      const permissionService = inject(PermissionService);
      const config = inject(PERMISSION_CONFIG);

      return firstValueFrom(
        authService.authState$.pipe(
          filter(authState => !authState.loading),
          take(1),
          switchMap(authState => {
            if (authState.isAuthenticated && authState.user?.role?.id) {
              config.roleId = authState.user.role.id;
              return permissionService.loadPermissions();
            }
            return of(null);
          })
        )
      );
    })
  ]
};
```

### 3. Mise à jour du AuthService

**`apps/back-office/src/app/core/services/auth.service.ts`**

```typescript
import { inject } from '@angular/core';
import { PERMISSION_CONFIG } from 'shared-lib';

export class AuthService {
  private permissionConfig = inject(PERMISSION_CONFIG);

  private setAuthState(user: BackofficeUser, token: string, refreshToken: string): void {
    if (user.role?.id) {
      this.permissionConfig.roleId = user.role.id;
      this.permissionConfig.endpoint = this.API_URL;
    }
    
    this.updateAuthState({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
      loading: false,
      error: null
    });
  }
}
```

---

## Utilisation

### 1. Protéger une route avec UNE permission (Toast par défaut)

```typescript
import { pluginPermissionGuard } from 'shared-lib';

export const routes: Routes = [
  {
    path: 'team/users',
    loadComponent: () => import('./users-list').then(c => c.UsersList),
    canActivate: [pluginPermissionGuard('users-permissions', 'user', 'find')]
  }
];
```

### 2. Protéger une route avec message i18n personnalisé

```typescript
{
  path: 'team/users',
  canActivate: [pluginPermissionGuard(
    'users-permissions',
    'user',
    'find',
    { translateKey: 'permissions.users' }
  )]
}
```

### 3. Protéger une route avec message direct

```typescript
{
  path: 'admin/settings',
  canActivate: [pluginPermissionGuard(
    'users-permissions',
    'role',
    'update',
    { 
      title: 'Paramètres réservés',
      message: 'Cette section est réservée aux super administrateurs.'
    }
  )]
}
```

### 4. Toast complètement personnalisé avec i18n

```typescript
{
  path: 'critical/section',
  canActivate: [pluginPermissionGuard(
    'users-permissions',
    'user',
    'destroy',
    {
      customToastConfigFactory: (translate) => ({
        type: 'danger',
        variant: 'header',
        style: 'border',
        position: 'top-center',
        icon: 'bi-shield-exclamation',
        autohide: false,
        title: translate.instant('permissions.critical.title'),
        message: translate.instant('permissions.critical.message'),
        actionButtons: [
          {
            label: translate.instant('permissions.critical.buttons.request'),
            cssClass: 'btn btn-sm btn-primary me-2',
            callback: () => {
              // Action personnalisée
              console.log('Request access');
            }
          },
          {
            label: translate.instant('permissions.critical.buttons.close'),
            cssClass: 'btn btn-sm btn-secondary',
            callback: () => {
              console.log('Close');
            }
          }
        ]
      })
    }
  )]
}
```

### 5. Désactiver le toast

```typescript
{
  path: 'silent/check',
  canActivate: [pluginPermissionGuard(
    'users-permissions',
    'user',
    'find',
    { showToast: false }
  )]
}
```

### 6. PLUSIEURS permissions (AND) - Toutes requises

```typescript
{
  path: 'admin/settings',
  canActivate: [multiplePermissionsGuard(
    [
      { plugin: 'users-permissions', controller: 'user', action: 'update' },
      { plugin: 'users-permissions', controller: 'role', action: 'find' }
    ],
    'all',
    { translateKey: 'permissions.admin' }
  )]
}
```

### 7. PLUSIEURS permissions (OR) - Au moins une requise

```typescript
{
  path: 'content/blog',
  canActivate: [multiplePermissionsGuard(
    [
      { api: 'blog-article', controller: 'blog-article', action: 'create' },
      { api: 'blog-article', controller: 'blog-article', action: 'update' }
    ],
    'any',
    {
      customToastConfigFactory: (translate) => ({
        type: 'warning',
        title: translate.instant('permissions.blog.title'),
        message: translate.instant('permissions.blog.message'),
        autohide: true,
        delay: 5000
      })
    }
  )]
}
```

### 8. Vérifier les permissions dans un composant

```typescript
import { Component, inject, computed } from '@angular/core';
import { PermissionService } from 'shared-lib';

@Component({
  selector: 'app-users-list',
  standalone: true
})
export class UserListComponent {
  private permissionService = inject(PermissionService);
  
  // Permission simple
  canCreate = computed(() => this.permissionService.canCreateUser());
  
  // Permissions multiples (AND)
  canEditAndDelete = computed(() => 
    this.permissionService.checkMultiplePermissions([
      { plugin: 'users-permissions', controller: 'user', action: 'update' },
      { plugin: 'users-permissions', controller: 'user', action: 'destroy' }
    ], 'all')
  );
  
  // Permissions multiples (OR)
  canEditOrDelete = computed(() => 
    this.permissionService.checkMultiplePermissions([
      { plugin: 'users-permissions', controller: 'user', action: 'update' },
      { plugin: 'users-permissions', controller: 'user', action: 'destroy' }
    ], 'any')
  );
}
```

### 9. Masquer des éléments dans le template

```html
<!-- Avec computed signal -->
@if (canCreate()) {
  <button (click)="createUser()">Créer</button>
}

@if (canEditAndDelete()) {
  <button (click)="editUser()">Modifier</button>
  <button (click)="deleteUser()">Supprimer</button>
}

<!-- Avec directive -->
<button *libHasPermission="{ 
  plugin: 'users-permissions', 
  controller: 'user', 
  action: 'create' 
}">
  Créer
</button>
```

---

## API Reference

### PermissionService

#### Méthodes principales

```typescript
// Charge les permissions depuis l'API
loadPermissions(): Observable<any>

// Recharge les permissions avec un nouveau roleId
reloadPermissions(roleId: number): Observable<any>

// Vérifie une permission API
hasPermission(api: string, controller: string, action: string): boolean

// Vérifie une permission Plugin
hasPluginPermission(plugin: string, controller: string, action: string): boolean

// Vérifie plusieurs permissions
checkMultiplePermissions(
  permissions: Array<{ plugin?: string; api?: string; controller: string; action: string }>,
  mode: 'all' | 'any'
): boolean
```

#### Méthodes helper pour users-permissions

```typescript
canAccessUserManagement(): boolean
canCreateUser(): boolean
canUpdateUser(): boolean
canDeleteUser(): boolean
canManageRoles(): boolean
```

#### Signals disponibles

```typescript
readonly permissions = computed(() => this.permissionsConfig());
readonly loaded = computed(() => this.isLoaded());
```

### Guards

#### pluginPermissionGuard

Protège une route avec une permission plugin.

```typescript
pluginPermissionGuard(
  plugin: string,           // Ex: 'users-permissions'
  controller: string,       // Ex: 'user'
  action: string,          // Ex: 'find'
  toastOptions?: PermissionDeniedToastOptions
): CanActivateFn
```

#### multiplePermissionsGuard

Protège une route avec plusieurs permissions.

```typescript
multiplePermissionsGuard(
  permissions: PermissionCheck[],
  mode: 'all' | 'any' = 'all',
  toastOptions?: PermissionDeniedToastOptions
): CanActivateFn
```

### PermissionDeniedToastOptions

Interface pour personnaliser les toasts :

```typescript
interface PermissionDeniedToastOptions {
  // Message et titre directs
  message?: string;
  title?: string;
  
  // Clé de traduction i18n
  translateKey?: string;
  translateParams?: any;
  
  // Désactiver le toast
  showToast?: boolean;
  
  // Config toast complète (sans i18n)
  customToastConfig?: any;
  
  // Factory pour config toast avec i18n
  customToastConfigFactory?: (translate: TranslateService) => any;
}
```

### Directive HasPermission

```typescript
import { HasPermissionDirective } from 'shared-lib';

// Dans template
<button *libHasPermission="{ 
  plugin: 'users-permissions',
  controller: 'user',
  action: 'create'
}">
  Action
</button>
```

---

## Internationalisation

### Structure des fichiers i18n

**`apps/back-office/src/assets/i18n/fr.json`**

```json
{
  "permissions": {
    "denied": {
      "title": "Accès refusé",
      "message": "Vous n'avez pas les permissions nécessaires pour accéder à cette ressource."
    },
    "users": {
      "title": "Gestion des utilisateurs",
      "message": "Vous n'avez pas la permission de gérer les utilisateurs."
    },
    "admin": {
      "title": "Administration",
      "message": "Seuls les administrateurs peuvent accéder à cette section."
    },
    "critical": {
      "title": "Zone critique",
      "message": "Accès restreint aux super administrateurs uniquement.",
      "buttons": {
        "request": "Demander l'accès",
        "close": "Fermer"
      }
    },
    "blog": {
      "title": "Gestion du blog",
      "message": "Vous devez pouvoir créer ou modifier des articles."
    }
  }
}
```

**`apps/back-office/src/assets/i18n/en.json`**

```json
{
  "permissions": {
    "denied": {
      "title": "Access Denied",
      "message": "You don't have permission to access this resource."
    },
    "users": {
      "title": "User Management",
      "message": "You don't have permission to manage users."
    },
    "admin": {
      "title": "Administration",
      "message": "Only administrators can access this section."
    },
    "critical": {
      "title": "Critical Zone",
      "message": "Access restricted to super administrators only.",
      "buttons": {
        "request": "Request Access",
        "close": "Close"
      }
    },
    "blog": {
      "title": "Blog Management",
      "message": "You must be able to create or edit articles."
    }
  }
}
```

---

## Exemples détaillés

### Exemple 1 : Gestion complète des utilisateurs

**Route avec guard**

```typescript
export const routes: Routes = [
  {
    path: 'team',
    children: [
      {
        path: 'users',
        loadComponent: () => import('./users-list').then(c => c.UsersList),
        canActivate: [pluginPermissionGuard(
          'users-permissions',
          'user',
          'find',
          { translateKey: 'permissions.users' }
        )]
      }
    ]
  }
];
```

**Composant**

```typescript
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PermissionService, HasPermissionDirective } from 'shared-lib';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './users-list.component.html'
})
export class UsersList {
  private permissionService = inject(PermissionService);
  
  users = signal<any[]>([]);
  
  canView = computed(() => this.permissionService.canAccessUserManagement());
  canCreate = computed(() => this.permissionService.canCreateUser());
  canUpdate = computed(() => this.permissionService.canUpdateUser());
  canDelete = computed(() => this.permissionService.canDeleteUser());
  
  canManageRoles = computed(() => this.permissionService.canManageRoles());
}
```

**Template**

```html
<div class="page-container">
  <div class="page-header">
    <h1>Gestion des Utilisateurs</h1>
    
    @if (canCreate()) {
      <button class="btn btn-primary" (click)="createUser()">
        <i class="bi-plus"></i> Créer un utilisateur
      </button>
    }
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Nom</th>
        <th>Email</th>
        <th>Rôle</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      @for (user of users(); track user.id) {
        <tr>
          <td>{{ user.username }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role?.name }}</td>
          <td>
            @if (canUpdate()) {
              <button class="btn btn-sm btn-warning" (click)="editUser(user)">
                <i class="bi-pencil"></i>
              </button>
            }
            
            @if (canDelete()) {
              <button class="btn btn-sm btn-danger" (click)="deleteUser(user)">
                <i class="bi-trash"></i>
              </button>
            }
          </td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

### Exemple 2 : Dashboard avec permissions multiples

```typescript
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard').then(c => c.Dashboard),
    canActivate: [multiplePermissionsGuard(
      [
        { api: 'blog-article', controller: 'blog-article', action: 'find' },
        { api: 'sales-contact', controller: 'sales-contact', action: 'find' }
      ],
      'any',
      {
        customToastConfigFactory: (translate) => ({
          type: 'warning',
          variant: 'header',
          title: translate.instant('permissions.dashboard.title'),
          message: translate.instant('permissions.dashboard.message'),
          autohide: true,
          delay: 7000
        })
      }
    )]
  }
];
```

### Exemple 3 : Zone critique avec confirmation

```typescript
{
  path: 'admin/danger-zone',
  canActivate: [pluginPermissionGuard(
    'users-permissions',
    'user',
    'destroy',
    {
      customToastConfigFactory: (translate) => ({
        type: 'danger',
        variant: 'header',
        style: 'border',
        position: 'top-center',
        icon: 'bi-shield-fill-exclamation',
        autohide: false,
        title: translate.instant('permissions.dangerZone.title'),
        message: translate.instant('permissions.dangerZone.message'),
        actionButtons: [
          {
            label: translate.instant('permissions.dangerZone.buttons.contact'),
            cssClass: 'btn btn-sm btn-primary me-2',
            callback: () => {
              window.location.href = 'mailto:admin@example.com';
            }
          },
          {
            label: translate.instant('permissions.dangerZone.buttons.back'),
            cssClass: 'btn btn-sm btn-secondary',
            callback: () => {
              window.history.back();
            }
          }
        ]
      })
    }
  )]
}
```

---

## Structure des permissions Strapi

Les permissions sont récupérées depuis l'endpoint :

```
GET /api/users-permissions/roles/{roleId}
```

**Réponse :**

```json
{
  "role": {
    "id": 3,
    "documentId": "y06j63sa69gxi4s2m1txm4xt",
    "name": "Admin Soncollab",
    "type": "soncollab_admin",
    "permissions": {
      "plugin::users-permissions": {
        "controllers": {
          "user": {
            "find": { "enabled": true, "policy": "" },
            "create": { "enabled": true, "policy": "" },
            "update": { "enabled": true, "policy": "" },
            "destroy": { "enabled": false, "policy": "" }
          }
        }
      },
      "api::blog-article": {
        "controllers": {
          "blog-article": {
            "find": { "enabled": true, "policy": "" },
            "create": { "enabled": false, "policy": "" }
          }
        }
      }
    }
  }
}
```

---

## Troubleshooting

### Les permissions ne se chargent pas

Vérifiez que :
1. Le `roleId` est bien défini dans `PERMISSION_CONFIG`
2. L'utilisateur est authentifié
3. L'endpoint API est correct
4. Le token JWT est valide

### Le toast ne s'affiche pas

Vérifiez que :
1. `ToastService` est bien fourni via `TOAST_SERVICE`
2. `showToast` n'est pas à `false`
3. Le service toast est bien importé dans l'app

### Les traductions ne fonctionnent pas

Vérifiez que :
1. Les clés existent dans vos fichiers i18n
2. `TranslateService` est bien configuré
3. Vous utilisez `customToastConfigFactory` pour accéder à `translate.instant()`

### Le guard bloque même avec les bonnes permissions

Vérifiez que :
1. Les permissions sont bien chargées (`permissionService.loaded()`)
2. Le `roleId` correspond au rôle de l'utilisateur
3. La syntaxe du guard correspond à la structure des permissions Strapi

---

## Notes importantes

- Les permissions sont chargées **automatiquement** au démarrage si l'utilisateur est connecté
- Les permissions sont mises à jour dans la config après chaque login
- Si `roleId = 0`, l'utilisateur n'est pas connecté
- Les guards affichent un toast et **bloquent l'accès** sans redirection
- L'utilisateur reste sur sa page actuelle
