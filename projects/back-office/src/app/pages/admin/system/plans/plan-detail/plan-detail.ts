import {Component, computed, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
import { BillingPlanDetail, SupportLevel, AVAILABLE_LOCALES } from '../../../../../core/models/admin/billing';
import { TranslationsModal } from '../../../../../core/components/admin/translations-modal/translations-modal';
import {
  TranslationOption,
  TranslationsModalService
} from '../../../../../core/services/admin/translations-modal.service';
import {DecimalPipe} from '@angular/common';
import {PlanOffcanvasService} from '../../../../../core/services/admin/plan-offcanvas.service';
import {PlanOffcanvas} from '../../../../../core/components/admin/plan-offcanvas/plan-offcanvas';

@Component({
  selector: 'app-plan-detail',
  standalone: true,
  imports: [Breadcrumb, TranslatePipe, Badge, RelativeDatePipe, TranslationsModal, DecimalPipe, PlanOffcanvas],
  templateUrl: './plan-detail.html',
  styleUrl: './plan-detail.css'
})
export class PlanDetail implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private permissionsService = inject(PermissionService);
  private translationsModalService = inject(TranslationsModalService);
  private planOffcanvasService = inject(PlanOffcanvasService);

  private destroy$ = new Subject<void>();
  private componentId = 'plan-detail';

  readonly availableLocales = AVAILABLE_LOCALES;
  plan = signal<BillingPlanDetail | null>(null);
  loading = signal(false);

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('billing-plan', 'billing-plan', 'delete')
  );

  hasLocalizations = computed(() => {
    const p = this.plan();
    return p && p.localizations && p.localizations.length > 0;
  });

  currentLocaleLabel = computed(() => {
    const p = this.plan();
    if (!p) return '';
    const locale = this.availableLocales.find(l => l.code === p.locale);
    return locale ? `${locale.flag} ${locale.label}` : p.locale.toUpperCase();
  });

  constructor() {
    // Écouter la fermeture de l'offcanvas pour recharger
    let wasOpen = false;

    effect(() => {
      const isOpen = this.planOffcanvasService.isOpen();
      const wasOpenBefore = wasOpen;

      if (wasOpenBefore && !isOpen && this.plan()) {
        const p = this.plan();
        if (p) {
          this.loadPlan(p.documentId, p.locale);
        }
      }

      wasOpen = isOpen;
    });
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params['documentId'];
      if (documentId) {
        this.loadPlan(documentId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadPlan(documentId: string, locale?: string): void {
    this.loading.set(true);
    this.billingService.getBillingPlan(documentId, locale)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.plan.set(response.data);
          this.loading.set(false);
          this.setBreadcrumbs();
          this.updatePageTitle();
        },
        error: (err) => {
          console.error('Error loading plan:', err);
          this.loading.set(false);
          this.toastService.showError(
            this.translate.instant('plan-detail.error.loading')
          );
          this.router.navigate(['/admin/system/billing/plans']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const planName = this.plan()?.plan_name || '';
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.plan-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.plan-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.plan-detail.plans'),
        route: '/admin/system/billing/plans'
      },
      {
        label: planName,
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('plan-detail.page_title')
    );
  }

  getSupportLevelBadge(): string {
    const level = this.plan()?.support_level;
    const badges: Record<SupportLevel, string> = {
      basic: 'bg-secondary-subtle text-secondary',
      priority: 'bg-info-subtle text-info',
      premium: 'bg-warning-subtle text-warning'
    };
    return level ? badges[level] : 'bg-secondary-subtle text-secondary';
  }

  translateSupportLevel(level: SupportLevel): string {
    return this.translate.instant(`plans-list.support_levels.${level}`);
  }

  viewTranslations(): void {
    const p = this.plan();
    if (!p) return;

    const allTranslations: TranslationOption[] = [];

    const currentLocaleConfig = this.availableLocales.find(l => l.code === p.locale);
    allTranslations.push({
      locale: p.locale,
      flag: currentLocaleConfig?.flag || '',
      label: currentLocaleConfig?.label || p.locale.toUpperCase(),
      documentId: p.documentId
    });

    if (p.localizations && p.localizations.length > 0) {
      p.localizations.forEach(loc => {
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
      this.loadPlan(translation.documentId, translation.locale);
    });
  }

  editPlan(): void {
    const p = this.plan();
    if (!p || !this.canUpdate()) return;
    this.planOffcanvasService.openEdit(p);
  }

  deletePlan(): void {
    const p = this.plan();
    if (!p || !this.canDelete()) return;

    this.confirmDialog.confirmDelete(p.plan_name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteBillingPlan(p.documentId, p.locale)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('plan-detail.toast.delete_success', { name: p.plan_name })
              );
              this.router.navigate(['/admin/system/billing/plans']);
            },
            error: (err) => {
              console.error('Error deleting plan:', err);
              this.toastService.showError(
                this.translate.instant('plan-detail.toast.delete_error')
              );
            }
          });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/plans']);
  }
}
