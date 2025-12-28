import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Badge,
  ConfirmDialogService,
  RelativeDatePipe,
  ToastService,
  PermissionService,
  Choice,
  ChoiceConfig,
  ChoiceOption,
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
import { AddonOffcanvasService } from '../../../../../core/services/admin/addon-offcanvas.service';
import { AddonOffcanvas } from '../../../../../core/components/admin/addon-offcanvas/addon-offcanvas';

@Component({
  selector: 'app-addon-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Breadcrumb,
    TranslatePipe,
    Badge,
    RelativeDatePipe,
    TranslationsModal,
    AddonOffcanvas,
  ],
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
  private addonOffcanvasService = inject(AddonOffcanvasService);

  private destroy$ = new Subject<void>();

  readonly availableLocales = AVAILABLE_LOCALES;
  addon = signal<PlanAddon | null>(null);
  loading = signal(false);
  selectedLocale = signal<string>('fr');

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

  currencySymbol = computed(() => {
    const a = this.addon();
    return a?.currency?.symbol || '€';
  });

  currencyPosition = computed(() => {
    const a = this.addon();
    return a?.currency?.symbol_position || 'right';
  });

  formattedPriceMonthly = computed(() => {
    const a = this.addon();
    if (!a) return '-';
    const symbol = this.currencySymbol();
    const position = this.currencyPosition();

    if (position === 'left') {
      return `${symbol}${a.price_monthly}`;
    } else {
      return `${a.price_monthly} ${symbol}`;
    }
  });

  formattedPriceYearly = computed(() => {
    const a = this.addon();
    if (!a) return '-';
    const symbol = this.currencySymbol();
    const position = this.currencyPosition();

    if (position === 'left') {
      return `${symbol}${a.price_yearly}`;
    } else {
      return `${a.price_yearly} ${symbol}`;
    }
  });

  languageOptions = computed<ChoiceOption[]>(() =>
    this.availableLocales.map(locale => ({
      value: locale.code,
      label: `${locale.flag} ${locale.label}`,
    }))
  );

  constructor() {
    let wasOpen = false;

    effect(() => {
      const isOpen = this.addonOffcanvasService.isOpen();

      if (wasOpen && !isOpen) {
        const a = this.addon();
        if (a) {
          this.loadAddon(a.documentId, a.locale);
        }
      }

      wasOpen = isOpen;
    });
  }

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

  onLanguageChoiceChange(newLocale: any): void {
    if (newLocale && newLocale !== this.selectedLocale()) {
      this.selectedLocale.set(newLocale);
      const a = this.addon();
      if (a) {
        this.loadAddon(a.documentId, newLocale);
      }
    }
  }

  private loadAddon(documentId: string, locale?: string): void {
    this.loading.set(true);
    this.billingService.getPlanAddon(documentId, locale)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.addon.set(response.data);
          this.selectedLocale.set(response.data.locale);
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
      this.selectedLocale.set(translation.locale);
      this.loadAddon(translation.documentId, translation.locale);
    });
  }

  editAddon(): void {
    const a = this.addon();
    if (!a || !this.canUpdate()) return;
    this.addonOffcanvasService.openEdit(a);
  }

  deleteAddon(): void {
    const a = this.addon();
    if (!a || !this.canDelete()) return;

    this.confirmDialog.confirmDelete(a.addon_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deletePlanAddon(a.documentId, a.locale)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('addon-detail.messages.delete_success', { name: a.addon_name })
              );
              this.router.navigate(['/admin/system/billing/addons']);
            },
            error: (err) => {
              console.error('Error deleting addon:', err);
              this.toastService.showError(
                this.translate.instant('addon-detail.messages.delete_error')
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
