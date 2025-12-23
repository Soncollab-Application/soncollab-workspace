import {Component, computed, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Badge, PermissionService, RelativeDatePipe } from 'shared-lib';
import { Breadcrumb } from '../../../../../core/components/breadcrumb/breadcrumb';
import { PageTitleService } from '../../../../../core/services/page-title.service';
import { BillingService } from '../../../../../core/services/admin/billing.service';
import { FeatureFlag, AVAILABLE_LOCALES } from '../../../../../core/models/admin/billing';
import { FeatureFlagOffcanvas } from '../../../../../core/components/admin/feature-flag-offcanvas/feature-flag-offcanvas';
import { FeatureFlagOffcanvasService } from '../../../../../core/services/admin/feature-flag-offcanvas.service';
import { TranslationsModal } from '../../../../../core/components/admin/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';

@Component({
  selector: 'app-feature-detail',
  standalone: true,
  imports: [
    CommonModule,
    Breadcrumb,
    TranslatePipe,
    Badge,
    RelativeDatePipe,
    FeatureFlagOffcanvas,
    TranslationsModal
  ],
  templateUrl: './feature-detail.html',
  styleUrl: './feature-detail.css'
})
export class FeatureDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private billingService = inject(BillingService);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private permissionsService = inject(PermissionService);
  private featureFlagOffcanvasService = inject(FeatureFlagOffcanvasService);
  private translationsModalService = inject(TranslationsModalService);

  private destroy$ = new Subject<void>();

  readonly availableLocales = AVAILABLE_LOCALES;
  feature = signal<FeatureFlag | null>(null);
  loading = signal(true);

  canUpdate = computed(() => this.permissionsService.hasPermission('feature-flag', 'feature-flag', 'update'));

  hasLocalizations = computed(() => {
    const f = this.feature();
    return f && f.localizations && f.localizations.length > 0;
  });

  currentLocaleLabel = computed(() => {
    const f = this.feature();
    if (!f) return '';
    const locale = this.availableLocales.find(l => l.code === f.locale);
    return locale ? `${locale.flag} ${locale.label}` : f.locale.toUpperCase();
  });

  statusBadgeType = computed(() => {
    const status = this.feature()?.feature_flag_status;
    if (!status) return 'secondary' as const;
    const types: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
      stable: 'success',
      beta: 'warning',
      deprecated: 'danger'
    };
    return (types[status] || 'secondary') as 'success' | 'warning' | 'danger' | 'secondary' | 'primary' | 'info';
  });

  constructor() {
    let wasOpen = false;

    effect(() => {
      const isOpen = this.featureFlagOffcanvasService.isOpen();

      if (wasOpen && !isOpen && this.feature()) {
        const f = this.feature();
        if (f) {
          this.loadFeature(f.documentId, f.locale);
        }
      }

      wasOpen = isOpen;
    });
  }

  ngOnInit(): void {
    this.setBreadcrumbs();
    this.loadFeature();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private setBreadcrumbs(): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.feature-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.feature-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.feature-detail.features'),
        route: '/admin/system/billing/features'
      },
      {
        label: '...',
        active: true
      }
    ]);
  }

  private updateBreadcrumbs(featureName: string): void {
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.feature-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.feature-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.feature-detail.features'),
        route: '/admin/system/billing/features'
      },
      {
        label: featureName,
        active: true
      }
    ]);
  }

  private loadFeature(documentId?: string, locale?: string): void {
    const id = documentId || this.route.snapshot.paramMap.get('documentId');
    if (!id) {
      this.router.navigate(['/admin/system/billing/features']);
      return;
    }

    this.loading.set(true);
    this.billingService.getFeatureFlag(id, locale)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.feature.set(response.data);
          this.updateBreadcrumbs(response.data.name);
          this.pageTitleService.setTitle(response.data.name);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading feature:', err);
          this.loading.set(false);
          this.router.navigate(['/admin/system/billing/features']);
        }
      });
  }



  editFeature(): void {
    const f = this.feature();
    if (!f || !this.canUpdate()) return;
    this.featureFlagOffcanvasService.openEdit(f);
  }

  viewTranslations(): void {
    const f = this.feature();
    if (!f) return;

    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === f.locale);
    allTranslations.push({
      locale: f.locale,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || f.locale.toUpperCase(),
      documentId: f.documentId
    });

    if (f.localizations && f.localizations.length > 0) {
      f.localizations.forEach(loc => {
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
      this.loadFeature(translation.documentId, translation.locale);
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/features']);
  }
}
