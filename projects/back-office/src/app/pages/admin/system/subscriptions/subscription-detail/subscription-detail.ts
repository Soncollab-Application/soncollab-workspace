import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DecimalPipe, DatePipe } from '@angular/common';
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
import {
  SubscriptionDetail,
  SubscriptionStatus,
  BillingCycle,
  SubscriptionQuota
} from '../../../../../core/models/admin/billing';

@Component({
  selector: 'app-subscription-detail',
  standalone: true,
  imports: [Breadcrumb, TranslatePipe, Badge, RelativeDatePipe, DecimalPipe, DatePipe],
  templateUrl: './subscription-detail.html',
  styleUrl: './subscription-detail.css'
})
export class SubscriptionDetailPage implements OnInit, OnDestroy {
  private billingService = inject(BillingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageTitleService = inject(PageTitleService);
  private translate = inject(TranslateService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastService = inject(ToastService);
  private permissionsService = inject(PermissionService);

  private destroy$ = new Subject<void>();
  private componentId = 'subscription-detail';

  subscription = signal<SubscriptionDetail | null>(null);
  loading = signal(false);

  canUpdate = computed(() =>
    this.permissionsService.hasPermission('subscription', 'subscription', 'update')
  );

  canDelete = computed(() =>
    this.permissionsService.hasPermission('subscription', 'subscription', 'delete')
  );

  subscriberName = computed(() => {
    const sub = this.subscription();
    if (!sub) return '';

    if (sub.subscriber_type === 'user' && sub.subscriber_user) {
      return `${sub.subscriber_user.first_name} ${sub.subscriber_user.last_name}`;
    } else if (sub.subscriber_type === 'team' && sub.subscriber_team) {
      return sub.subscriber_team.team_name;
    }
    return '';
  });

  subscriberEmail = computed(() => {
    const sub = this.subscription();
    if (!sub) return '';

    if (sub.subscriber_type === 'user' && sub.subscriber_user) {
      return sub.subscriber_user.email;
    }
    return '';
  });

  daysUntilExpiry = computed(() => {
    const sub = this.subscription();
    if (!sub) return 0;

    const endDate = new Date(sub.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });

  isExpiringSoon = computed(() => {
    const days = this.daysUntilExpiry();
    return days > 0 && days <= 30;
  });

  isExpired = computed(() => {
    return this.daysUntilExpiry() < 0;
  });

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params['documentId'];
      if (documentId) {
        this.loadSubscription(documentId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pageTitleService.resetBreadcrumbs();
  }

  private loadSubscription(documentId: string): void {
    this.loading.set(true);
    this.billingService.getSubscription(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.subscription.set(response.data);
          this.loading.set(false);
          this.setBreadcrumbs();
          this.updatePageTitle();
        },
        error: (err) => {
          console.error('Error loading subscription:', err);
          this.loading.set(false);
          this.toastService.showError(
            this.translate.instant('subscription-detail.error.loading')
          );
          this.router.navigate(['/admin/system/billing/subscriptions']);
        }
      });
  }

  private setBreadcrumbs(): void {
    const subscriberName = this.subscriberName();
    this.pageTitleService.setCustomBreadcrumbs([
      {
        label: this.translate.instant('breadcrumbs.subscription-detail.dashboard'),
        route: '/admin/dashboard'
      },
      {
        label: this.translate.instant('breadcrumbs.subscription-detail.system')
      },
      {
        label: this.translate.instant('breadcrumbs.subscription-detail.subscriptions'),
        route: '/admin/system/billing/subscriptions'
      },
      {
        label: subscriberName,
        active: true
      }
    ]);
  }

  private updatePageTitle(): void {
    this.pageTitleService.setTitle(
      this.translate.instant('subscription-detail.page_title')
    );
  }

  getStatusBadgeType(status: SubscriptionStatus): 'success' | 'info' | 'danger' | 'warning' {
    const types: Record<SubscriptionStatus, 'success' | 'info' | 'danger' | 'warning'> = {
      active: 'success',
      trial: 'info',
      cancelled: 'danger',
      paused: 'warning'
    };
    return types[status] || 'secondary' as any;
  }

  translateStatus(status: SubscriptionStatus): string {
    return this.translate.instant(`subscriptions-list.status.${status}`);
  }

  translateBillingCycle(cycle: BillingCycle): string {
    return this.translate.instant(`subscriptions-list.billing_cycle.${cycle}`);
  }

  getQuotaPercentage(quota: SubscriptionQuota): number {
    if (!quota || !quota.max_value) return 0;
    return Math.round((quota.current_usage / quota.max_value) * 100);
  }

  getQuotaClass(quota: SubscriptionQuota): string {
    const percentage = this.getQuotaPercentage(quota);
    if (percentage >= 100) return 'bg-danger';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-success';
  }

  viewPlan(): void {
    const sub = this.subscription();
    if (sub?.plan?.documentId) {
      this.router.navigate(['/admin/system/billing/plans', sub.plan.documentId]);
    }
  }

  editSubscription(): void {
    const sub = this.subscription();
    if (!sub || !this.canUpdate()) return;
    console.log('Edit subscription:', sub.documentId);
  }

  deleteSubscription(): void {
    const sub = this.subscription();
    if (!sub || !this.canDelete()) return;

    const name = this.subscriberName();
    this.confirmDialog.confirmDelete(name).then((confirmed) => {
      if (confirmed) {
        this.billingService.deleteSubscription(sub.documentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastService.showSuccess(
                this.translate.instant('subscription-detail.toast.delete_success', { name })
              );
              this.router.navigate(['/admin/system/billing/subscriptions']);
            },
            error: () => {
              this.toastService.showError(
                this.translate.instant('subscription-detail.toast.delete_error', { name })
              );
            }
          });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/system/billing/subscriptions']);
  }
}
