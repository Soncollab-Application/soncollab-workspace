import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import {
  Badge,
  ConfirmDialogService,
  RelativeDatePipe,
  ToastService,
  PermissionService,
} from 'shared-lib';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { BillingService } from '../../../../../core/services/admin/billing.service';
import { PlanAddon, AVAILABLE_LOCALES } from '../../../../../core/models/admin/billing';
import { TranslationsModal } from '../../../../../core/components/admin/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';

@Component({
  selector: 'app-addon-detail',
  standalone: true,
  imports: [Breadcrumb, TranslatePipe, Badge, RelativeDatePipe, TranslationsModal],
  templateUrl: './addon-detail.html',
  styleUrl: './addon-detail.css'
})
export class AddonDetail implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private permissionsService = inject(PermissionService);
  private translationsModalService = inject(TranslationsModalService);

  private destroy$ = new Subject<void>();
  private componentId = 'addon-detail';

  readonly availableLocales = AVAILABLE_LOCALES;
  addon = signal<PlanAddon | null>(null);
  loading = signal(false);

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('plan-addon', 'plan-addon', 'delete')
  );

  hasLocalizations = computed(() => {
    const a = this.addon();
    return a && a.localizations && a.localizations.length > 0;
  });

  currentLocaleLabel = computed(() => {
    const a = this.addon();
    if (!a) return '';
    const locale = this.availableLocales.find(l => l.code === a.locale);
    return locale ? `${locale.flag} ${locale.label}` : a.locale.toUpperCase();
  });

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params['documentId'];
      if (documentId) {
        this.loadAddon(documentId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadAddon(documentId: string, locale?: string): void {
    this.loading.set(true);
    this.billingService.getPlanAddon(documentId, locale)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.addon.set(response.data);
          this.loading.set(false);
          this.setBreadcrumbs();
          this.updatePageTitle();
        },
        error: (err) => {
          console.error('Error loading addon:', err);
          this.loading.set(false);
          this.toastService.showError(
            this.translate.instant('addon-detail.error.loading')
          );
          this.router.navigate(['/admin/system/billing/addons']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const addonName = this.addon()?.addon_name || '';
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.addon-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.addon-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.addon-detail.addons'),
        route: '/admin/system/billing/addons'
      },
      {
        label: addonName,
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('addon-detail.page_title')
    );
  }

  viewTranslations(): void {
    const a = this.addon();
    if (!a) return;

    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === a.locale);
    allTranslations.push({
      locale: a.locale,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || a.locale.toUpperCase(),
      documentId: a.documentId
    });

    if (a.localizations && a.localizations.length > 0) {
      a.localizations.forEach(loc => {
        const localeConfig = this.availableLocales.find(l => l.code === loc.locale);
        allTranslations.push({
          locale: loc.locale,
          flag: localeConfig?.flag || '',
          label: localeConfig?.label || loc.locale.toUpperCase(),
          documentId: loc.documentId
        });
      });
    }

    this.translationsModalService.open(allTranslations, (translation) => {
      this.loadAddon(translation.documentId, translation.locale);
    });
  }

  editAddon(): void {
    const a = this.addon();
    if (!a || !this.canUpdate()) return;
    console.log('Edit addon:', a.documentId);
  }

  deleteAddon(): void {
    const a = this.addon();
    if (!a || !this.canDelete()) return;

    this.confirmDialog.confirmDelete(a.addon_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePlanAddon(a.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('addon-detail.toast.delete_success', { name: a.addon_name })
              );
              this.router.navigate(['/admin/system/billing/addons']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('addon-detail.toast.delete_error', { name: a.addon_name })
              );
            }
          });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/addons']);
  }
}
