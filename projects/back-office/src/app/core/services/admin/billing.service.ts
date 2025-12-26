import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BillingPlanFilters,
  BillingPlansResponse,
  BillingPlanResponse,
  PlanAddonFilters,
  PlanAddonsResponse,
  PlanAddonResponse,
  PlanAddonCreateRequest,
  PlanAddonUpdateRequest,
  SubscriptionFilters,
  SubscriptionsResponse,
  SubscriptionResponse,
  SubscriptionLifecycleStats,
  SubscriptionUsageStats,
  SubscriptionQuotasResponse,
  SubscriptionActivateRequest,
  SubscriptionActivateResponse,
  SubscriptionReactivateRequest,
  SubscriptionReactivateResponse,
  SubscriptionExpireCheckResponse,
  SubscriptionExpireProcessResponse,
  SubscriptionResetQuotasResponse,
  PaymentLinkFilters,
  PaymentLinksResponse,
  PaymentLinkResponse,
  PaymentLinkDashboard,
  PaymentLinkConversionStats,
  CurrenciesResponse,
  CurrencyUpdateRequest,
  Currency,
  FeatureFlagsResponse,
  FeatureFlagUpdateRequest,
  FeatureFlag,
  ProductTypesResponse,
  PaymentMethodsResponse,
  PaymentProviderHealth,
  PaymentProviderStats,
  InvoicesResponse,
  InvoiceResponse,
  InvoiceStats,
  RecentInvoicesResponse,
  TransactionsResponse,
  CreateBillingPlanRequest,
  UpdateBillingPlanRequest,
  TransactionsStatsResponse,
  FeatureFlagFilters,
  FeatureFlagResponse,
  FeatureFlagCreateRequest,
  FeatureFlagStats, BillingPlanStats
} from '../../models/admin/billing';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly BILLING_ENDPOINTS = {
    // Billing Plans
    billing_plans: `${this.API_URL}/billing-plans`,
    billing_plan_by_id: (documentId: string) => `${this.API_URL}/billing-plans/${documentId}`,
    billing_plan_pricing: (locale: string) => `${this.API_URL}/billing-plans/pricing/${locale}`,
    billing_plans_stats: `${this.API_URL}/billing-plans/stats`,


    // Plan Addons
    plan_addons: `${this.API_URL}/plan-addons`,
    plan_addon_by_id: (documentId: string) => `${this.API_URL}/plan-addons/${documentId}`,

    // Subscriptions
    subscriptions: `${this.API_URL}/subscriptions`,
    subscription_by_id: (documentId: string) => `${this.API_URL}/subscriptions/${documentId}`,
    subscription_activate: (transactionId: string) => `${this.API_URL}/admin/subscriptions/activate/${transactionId}`,
    subscription_lifecycle_stats: `${this.API_URL}/admin/subscriptions/lifecycle-stats`,
    subscription_quotas: (subscriptionId: string) => `${this.API_URL}/admin/subscriptions/quotas/${subscriptionId}`,
    subscription_usage_stats: `${this.API_URL}/admin/subscriptions/usage-stats`,
    subscription_reset_quotas: `${this.API_URL}/admin/subscriptions/reset-quotas`,
    subscription_expire_check: `${this.API_URL}/admin/subscriptions/expire-check`,
    subscription_expire_process: `${this.API_URL}/admin/subscriptions/expire-process`,
    subscription_reactivate: (id: string) => `${this.API_URL}/admin/subscriptions/${id}/reactivate`,

    // Payment Links
    payment_links: `${this.API_URL}/subscription-payment-links`,
    payment_link_by_id: (documentId: string) => `${this.API_URL}/subscription-payment-links/${documentId}`,
    payment_link_dashboard: `${this.API_URL}/subscription-payment-links/dashboard`,
    payment_link_conversion_stats: `${this.API_URL}/subscription-payment-links/conversion-stats`,

    // Payment Methods
    payment_methods: `${this.API_URL}/subscription-payment-methods`,
    payment_method_by_id: (documentId: string) => `${this.API_URL}/subscription-payment-methods/${documentId}`,
    payment_providers_health: `${this.API_URL}/admin/payment-providers/health`,
    payment_providers_stats: `${this.API_URL}/admin/payment-providers/stats`,
    payment_providers_retry_failed: `${this.API_URL}/admin/payment-providers/retry-failed`,
    payment_providers_cleanup: `${this.API_URL}/admin/payment-providers/cleanup`,
    payment_providers_transactions: (provider: string) => `${this.API_URL}/admin/payment-providers/transactions/${provider}`,

    // Invoices
    invoices: `${this.API_URL}/subscription-invoices`,
    invoice_by_id: (documentId: string) => `${this.API_URL}/subscription-invoices/${documentId}`,
    invoice_generate: (transactionId: string) => `${this.API_URL}/subscription-invoices/generate/${transactionId}`,
    invoice_refund: (transactionId: string) => `${this.API_URL}/subscription-invoices/refund/${transactionId}`,
    invoice_export_accounting: `${this.API_URL}/subscription-invoices/export-accounting`,
    invoice_stats: `${this.API_URL}/subscription-invoices/stats`,
    invoice_recent: `${this.API_URL}/subscription-invoices/recent`,

    // Transactions
    transactions: `${this.API_URL}/subscription-transactions`,
    transaction_by_id: (documentId: string) => `${this.API_URL}/subscription-transactions/${documentId}`,
    transaction_stats: `${this.API_URL}/subscription-transactions/stats`,

    // Currencies
    currencies: `${this.API_URL}/billing-currencies`,
    currency_by_id: (documentId: string) => `${this.API_URL}/billing-currencies/${documentId}`,

    // Feature Flags
    feature_flags: `${this.API_URL}/feature-flags`,
    feature_flag_by_id: (documentId: string) => `${this.API_URL}/feature-flags/${documentId}`,
    feature_flags_stats: `${this.API_URL}/feature-flags/stats`,

    // Product Types
    product_types: `${this.API_URL}/product-types`
  };

  // ==================== BILLING PLANS ====================

  getBillingPlans(
    page = 1,
    pageSize = 10,
    filters?: BillingPlanFilters,
    sortField = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<BillingPlansResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`);

    params = params.set('populate[currency][fields][0]', 'code');
    params = params.set('populate[currency][fields][1]', 'symbol');
    params = params.set('populate[product_type][fields][0]', 'name');
    params = params.set('populate[included_features][fields][0]', 'name');
    params = params.set('populate[available_addons][fields][0]', 'addon_name');
    params = params.set('populate[localizations][fields][0]', 'locale');
    params = params.set('populate[localizations][fields][1]', 'documentId');
    params = params.set('populate[localizations][fields][2]', 'plan_name');

    // FILTRER PAR LOCALE
    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.search) {
      params = params.set('filters[plan_name][$containsi]', filters.search);
    }

    if (filters?.product_type) {
      params = params.set('filters[product_type][name][$eq]', filters.product_type);
    }

    if (filters?.currency) {
      params = params.set('filters[currency][code][$eq]', filters.currency);
    }

    if (filters?.is_active !== undefined) {
      params = params.set('filters[is_active][$eq]', filters.is_active.toString());
    }

    if (filters?.support_level) {
      params = params.set('filters[support_level][$eq]', filters.support_level);
    }

    return this.http.get<BillingPlansResponse>(this.BILLING_ENDPOINTS.billing_plans, { params });
  }

  getBillingPlan(documentId: string, locale?: string): Observable<BillingPlanResponse> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'currency');
    params = params.set('populate[1]', 'product_type');
    params = params.set('populate[2]', 'included_features');
    params = params.set('populate[3]', 'available_addons');
    params = params.set('populate[4]', 'subscriptions');
    params = params.set('populate[5]', 'localizations');

    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<BillingPlanResponse>(
      this.BILLING_ENDPOINTS.billing_plan_by_id(documentId),
      { params }
    );
  }

  createBillingPlan(data: CreateBillingPlanRequest): Observable<BillingPlanResponse> {
    return this.http.post<BillingPlanResponse>(this.BILLING_ENDPOINTS.billing_plans, { data });
  }

  updateBillingPlan(documentId: string, data: UpdateBillingPlanRequest): Observable<BillingPlanResponse> {
    let params = new HttpParams();
    if (data.locale) {
      params = params.set('locale', data.locale);
    }

    return this.http.put<BillingPlanResponse>(
      this.BILLING_ENDPOINTS.billing_plan_by_id(documentId),
      { data },
      { params }
    );
  }

  deleteBillingPlan(documentId: string): Observable<void> {
    return this.http.delete<void>(this.BILLING_ENDPOINTS.billing_plan_by_id(documentId));
  }

  getBillingPlanPricing(locale: string): Observable<any> {
    return this.http.get(this.BILLING_ENDPOINTS.billing_plan_pricing(locale));
  }

  getBillingPlanStats(locale: string): Observable<{ data: BillingPlanStats }> {
    const params = new HttpParams().set('locale', locale);
    return this.http.get<{ data: BillingPlanStats }>(
      this.BILLING_ENDPOINTS.billing_plans_stats,
      { params }
    );
  }

  // ==================== PLAN ADDONS ====================

  getPlanAddons(
    page = 1,
    pageSize = 10,
    filters?: PlanAddonFilters,
    sortField = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<PlanAddonsResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`);

    params = params.set('populate[features_included][fields][0]', 'name');
    params = params.set('populate[features_included][fields][1]', 'description');
    params = params.set('populate[localizations][fields][0]', 'locale');
    params = params.set('populate[localizations][fields][1]', 'documentId');
    params = params.set('populate[localizations][fields][2]', 'addon_name');

    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.search) {
      params = params.set('filters[addon_name][$containsi]', filters.search);
    }

    if (filters?.is_active !== undefined) {
      params = params.set('filters[is_active][$eq]', filters.is_active.toString());
    }

    if (filters?.visible_to_users !== undefined) {
      params = params.set('filters[visible_to_users][$eq]', filters.visible_to_users.toString());
    }

    return this.http.get<PlanAddonsResponse>(this.BILLING_ENDPOINTS.plan_addons, { params });
  }

  getPlanAddon(documentId: string, locale?: string): Observable<PlanAddonResponse> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'features_included');
    params = params.set('populate[1]', 'billing_plans');
    params = params.set('populate[2]', 'subscriptions');
    params = params.set('populate[3]', 'localizations');

    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<PlanAddonResponse>(
      this.BILLING_ENDPOINTS.plan_addon_by_id(documentId),
      { params }
    );
  }

  createPlanAddon(data: PlanAddonCreateRequest): Observable<PlanAddonResponse> {
    return this.http.post<PlanAddonResponse>(this.BILLING_ENDPOINTS.plan_addons, { data });
  }

  updatePlanAddon(documentId: string, data: PlanAddonUpdateRequest): Observable<PlanAddonResponse> {
    return this.http.put<PlanAddonResponse>(
      this.BILLING_ENDPOINTS.plan_addon_by_id(documentId),
      { data }
    );
  }

  deletePlanAddon(documentId: string): Observable<void> {
    return this.http.delete<void>(this.BILLING_ENDPOINTS.plan_addon_by_id(documentId));
  }

  // ==================== SUBSCRIPTIONS ====================

  getSubscriptions(
    page = 1,
    pageSize = 10,
    filters?: SubscriptionFilters,
    sortField = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<SubscriptionsResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`);

    params = params.set('populate[subscriber_user][fields][0]', 'email');
    params = params.set('populate[subscriber_user][fields][1]', 'username');
    params = params.set('populate[subscriber_user][fields][2]', 'first_name');
    params = params.set('populate[subscriber_user][fields][3]', 'last_name');
    params = params.set('populate[subscriber_team][fields][0]', 'team_name');
    params = params.set('populate[subscriber_team][fields][1]', 'slug');
    params = params.set('populate[plan][fields][0]', 'plan_name');
    params = params.set('populate[plan][fields][1]', 'documentId');
    params = params.set('populate[addons][fields][0]', 'addon_name');

    if (filters?.search) {
      params = params.set('filters[$or][0][subscriber_user][email][$containsi]', filters.search);
      params = params.set('filters[$or][1][subscriber_team][team_name][$containsi]', filters.search);
    }

    if (filters?.subscription_status) {
      params = params.set('filters[subscription_status][$eq]', filters.subscription_status);
    }

    if (filters?.billing_cycle) {
      params = params.set('filters[billing_cycle][$eq]', filters.billing_cycle);
    }

    if (filters?.plan) {
      params = params.set('filters[plan][documentId][$eq]', filters.plan);
    }

    if (filters?.subscriber_type) {
      params = params.set('filters[subscriber_type][$eq]', filters.subscriber_type);
    }

    return this.http.get<SubscriptionsResponse>(this.BILLING_ENDPOINTS.subscriptions, { params });
  }

  getSubscription(documentId: string): Observable<SubscriptionResponse> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'subscriber_user');
    params = params.set('populate[1]', 'subscriber_team');
    params = params.set('populate[2]', 'plan');
    params = params.set('populate[3]', 'addons');
    params = params.set('populate[4]', 'quotas');
    params = params.set('populate[5]', 'subscription_transactions');

    return this.http.get<SubscriptionResponse>(
      this.BILLING_ENDPOINTS.subscription_by_id(documentId),
      { params }
    );
  }

  createSubscription(data: any): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(this.BILLING_ENDPOINTS.subscriptions, { data });
  }

  updateSubscription(documentId: string, data: any): Observable<SubscriptionResponse> {
    return this.http.put<SubscriptionResponse>(
      this.BILLING_ENDPOINTS.subscription_by_id(documentId),
      { data }
    );
  }

  deleteSubscription(documentId: string): Observable<void> {
    return this.http.delete<void>(this.BILLING_ENDPOINTS.subscription_by_id(documentId));
  }

  activateSubscription(request: SubscriptionActivateRequest): Observable<SubscriptionActivateResponse> {
    return this.http.post<SubscriptionActivateResponse>(
      this.BILLING_ENDPOINTS.subscription_activate(request.transactionId),
      {}
    );
  }

  reactivateSubscription(
    subscriptionId: string,
    request: SubscriptionReactivateRequest
  ): Observable<SubscriptionReactivateResponse> {
    return this.http.post<SubscriptionReactivateResponse>(
      this.BILLING_ENDPOINTS.subscription_reactivate(subscriptionId),
      request
    );
  }

  getSubscriptionLifecycleStats(): Observable<{ data: SubscriptionLifecycleStats }> {
    return this.http.get<{ data: SubscriptionLifecycleStats }>(
      this.BILLING_ENDPOINTS.subscription_lifecycle_stats
    );
  }

  getSubscriptionQuotas(subscriptionId: string): Observable<SubscriptionQuotasResponse> {
    return this.http.get<SubscriptionQuotasResponse>(
      this.BILLING_ENDPOINTS.subscription_quotas(subscriptionId)
    );
  }

  getSubscriptionUsageStats(): Observable<{ data: SubscriptionUsageStats }> {
    return this.http.get<{ data: SubscriptionUsageStats }>(
      this.BILLING_ENDPOINTS.subscription_usage_stats
    );
  }

  resetSubscriptionQuotas(): Observable<SubscriptionResetQuotasResponse> {
    return this.http.post<SubscriptionResetQuotasResponse>(
      this.BILLING_ENDPOINTS.subscription_reset_quotas,
      {}
    );
  }

  checkSubscriptionExpirations(): Observable<SubscriptionExpireCheckResponse> {
    return this.http.post<SubscriptionExpireCheckResponse>(
      this.BILLING_ENDPOINTS.subscription_expire_check,
      {}
    );
  }

  processSubscriptionExpirations(): Observable<SubscriptionExpireProcessResponse> {
    return this.http.post<SubscriptionExpireProcessResponse>(
      this.BILLING_ENDPOINTS.subscription_expire_process,
      {}
    );
  }

  // ==================== PAYMENT LINKS ====================

  getPaymentLinks(
    page = 1,
    pageSize = 10,
    filters?: PaymentLinkFilters,
    sortField = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<PaymentLinksResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`);

    params = params.set('populate[created_by][fields][0]', 'username');
    params = params.set('populate[created_by][fields][1]', 'first_name');
    params = params.set('populate[created_by][fields][2]', 'last_name');
    params = params.set('populate[sales_contact][fields][0]', 'email');
    params = params.set('populate[sales_contact][fields][1]', 'first_name');
    params = params.set('populate[sales_contact][fields][2]', 'last_name');

    if (filters?.search) {
      params = params.set('filters[$or][0][customer_email][$containsi]', filters.search);
      params = params.set('filters[$or][1][customer_name][$containsi]', filters.search);
    }

    if (filters?.link_status) {
      params = params.set('filters[link_status][$eq]', filters.link_status);
    }

    if (filters?.created_by) {
      params = params.set('filters[created_by][documentId][$eq]', filters.created_by);
    }

    if (filters?.date_from) {
      params = params.set('filters[createdAt][$gte]', filters.date_from);
    }

    if (filters?.date_to) {
      params = params.set('filters[createdAt][$lte]', filters.date_to);
    }

    return this.http.get<PaymentLinksResponse>(this.BILLING_ENDPOINTS.payment_links, { params });
  }

  getPaymentLink(documentId: string): Observable<PaymentLinkResponse> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'sales_contact');
    params = params.set('populate[1]', 'created_by');
    params = params.set('populate[2]', 'subscription_transaction');

    return this.http.get<PaymentLinkResponse>(
      this.BILLING_ENDPOINTS.payment_link_by_id(documentId),
      { params }
    );
  }

  createPaymentLink(data: any): Observable<PaymentLinkResponse> {
    return this.http.post<PaymentLinkResponse>(this.BILLING_ENDPOINTS.payment_links, { data });
  }

  updatePaymentLink(documentId: string, data: any): Observable<PaymentLinkResponse> {
    return this.http.put<PaymentLinkResponse>(
      this.BILLING_ENDPOINTS.payment_link_by_id(documentId),
      { data }
    );
  }

  deletePaymentLink(documentId: string): Observable<void> {
    return this.http.delete<void>(this.BILLING_ENDPOINTS.payment_link_by_id(documentId));
  }

  getPaymentLinkDashboard(period = '30d'): Observable<{ data: PaymentLinkDashboard }> {
    const params = new HttpParams().set('period', period);
    return this.http.get<{ data: PaymentLinkDashboard }>(
      this.BILLING_ENDPOINTS.payment_link_dashboard,
      { params }
    );
  }

  getPaymentLinkConversionStats(period = '30d', salesRepId?: string): Observable<{ data: PaymentLinkConversionStats }> {
    let params = new HttpParams().set('period', period);

    if (salesRepId) {
      params = params.set('sales_rep_id', salesRepId);
    }

    return this.http.get<{ data: PaymentLinkConversionStats }>(
      this.BILLING_ENDPOINTS.payment_link_conversion_stats,
      { params }
    );
  }

  // ==================== PAYMENT METHODS ====================

  getPaymentMethods(page = 1, pageSize = 100): Observable<PaymentMethodsResponse> {
    const params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', 'priority_order:asc');

    return this.http.get<PaymentMethodsResponse>(this.BILLING_ENDPOINTS.payment_methods, { params });
  }

  getPaymentProvidersHealth(): Observable<{ data: PaymentProviderHealth }> {
    return this.http.get<{ data: PaymentProviderHealth }>(
      this.BILLING_ENDPOINTS.payment_providers_health
    );
  }

  getPaymentProvidersStats(timeframe = '24h'): Observable<{ data: PaymentProviderStats }> {
    const params = new HttpParams().set('timeframe', timeframe);
    return this.http.get<{ data: PaymentProviderStats }>(
      this.BILLING_ENDPOINTS.payment_providers_stats,
      { params }
    );
  }

  retryFailedPayments(maxRetries = 5): Observable<any> {
    return this.http.post(
      this.BILLING_ENDPOINTS.payment_providers_retry_failed,
      { max_retries: maxRetries }
    );
  }

  cleanupAbandonedTransactions(): Observable<any> {
    return this.http.post(this.BILLING_ENDPOINTS.payment_providers_cleanup, {});
  }

  // ==================== INVOICES ====================

  getInvoices(page = 1, pageSize = 10): Observable<InvoicesResponse> {
    const params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', 'createdAt:desc');

    return this.http.get<InvoicesResponse>(this.BILLING_ENDPOINTS.invoices, { params });
  }

  getInvoice(documentId: string): Observable<InvoiceResponse> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'subscription');
    params = params.set('populate[1]', 'subscription_transaction');
    params = params.set('populate[2]', 'generated_by');
    params = params.set('populate[3]', 'pdf_file');

    return this.http.get<InvoiceResponse>(
      this.BILLING_ENDPOINTS.invoice_by_id(documentId),
      { params }
    );
  }

  generateInvoice(transactionId: string): Observable<InvoiceResponse> {
    return this.http.post<InvoiceResponse>(
      this.BILLING_ENDPOINTS.invoice_generate(transactionId),
      {}
    );
  }

  processRefund(transactionId: string): Observable<any> {
    return this.http.post(this.BILLING_ENDPOINTS.invoice_refund(transactionId), {});
  }

  exportInvoicesForAccounting(): Observable<any> {
    return this.http.get(this.BILLING_ENDPOINTS.invoice_export_accounting);
  }

  getInvoiceStats(): Observable<{ data: InvoiceStats }> {
    return this.http.get<{ data: InvoiceStats }>(this.BILLING_ENDPOINTS.invoice_stats);
  }

  getRecentInvoices(): Observable<RecentInvoicesResponse> {
    return this.http.get<RecentInvoicesResponse>(this.BILLING_ENDPOINTS.invoice_recent);
  }

  // ==================== TRANSACTIONS ====================

  getTransactions(page = 1, pageSize = 10): Observable<TransactionsResponse> {
    const params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', 'transaction_date:desc');

    return this.http.get<TransactionsResponse>(this.BILLING_ENDPOINTS.transactions, { params });
  }

  getTransaction(documentId: string): Observable<any> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'subscription');
    params = params.set('populate[1]', 'sales_contact');
    params = params.set('populate[2]', 'payment_method');
    params = params.set('populate[3]', 'payment_link');

    return this.http.get(this.BILLING_ENDPOINTS.transaction_by_id(documentId), { params });
  }

  getTransactionStats(): Observable<TransactionsStatsResponse> {
    return this.http.get<TransactionsStatsResponse>(this.BILLING_ENDPOINTS.transaction_stats);
  }

  // ==================== CURRENCIES ====================

  getCurrencies(): Observable<CurrenciesResponse> {
    const params = new HttpParams()
      .set('pagination[pageSize]', '100')
      .set('sort[0]', 'code:asc');

    return this.http.get<CurrenciesResponse>(this.BILLING_ENDPOINTS.currencies, { params });
  }

  updateCurrency(documentId: string, data: CurrencyUpdateRequest): Observable<{ data: Currency }> {
    return this.http.put<{ data: Currency }>(
      this.BILLING_ENDPOINTS.currency_by_id(documentId),
      { data }
    );
  }

  // ==================== FEATURE FLAGS ====================

  getFeatureFlags(
    page = 1,
    pageSize = 10,
    filters?: FeatureFlagFilters,
    sortField = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Observable<FeatureFlagsResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString())
      .set('sort[0]', `${sortField}:${sortOrder}`);

    params = params.set('populate[localizations][fields][0]', 'locale');
    params = params.set('populate[localizations][fields][1]', 'documentId');
    params = params.set('populate[localizations][fields][2]', 'name');

    if (filters?.locale) {
      params = params.set('locale', filters.locale);
    }

    if (filters?.search) {
      params = params.set('filters[name][$containsi]', filters.search);
    }

    if (filters?.feature_flag_status) {
      params = params.set('filters[feature_flag_status][$eq]', filters.feature_flag_status);
    }

    if (filters?.is_enabled_by_default !== undefined) {
      params = params.set('filters[is_enabled_by_default][$eq]', filters.is_enabled_by_default.toString());
    }

    return this.http.get<FeatureFlagsResponse>(this.BILLING_ENDPOINTS.feature_flags, { params });
  }

  getFeatureFlag(documentId: string, locale?: string): Observable<FeatureFlagResponse> {
    let params = new HttpParams();

    params = params.set('populate[localizations][fields][0]', 'locale');
    params = params.set('populate[localizations][fields][1]', 'documentId');
    params = params.set('populate[localizations][fields][2]', 'name');

    if (locale) {
      params = params.set('locale', locale);
    }

    return this.http.get<FeatureFlagResponse>(
      this.BILLING_ENDPOINTS.feature_flag_by_id(documentId),
      { params }
    );
  }

  createFeatureFlag(data: FeatureFlagCreateRequest): Observable<FeatureFlagResponse> {
    return this.http.post<FeatureFlagResponse>(this.BILLING_ENDPOINTS.feature_flags, { data });
  }

  updateFeatureFlag(documentId: string, data: FeatureFlagUpdateRequest): Observable<FeatureFlagResponse> {
    return this.http.put<FeatureFlagResponse>(
      this.BILLING_ENDPOINTS.feature_flag_by_id(documentId),
      { data }
    );
  }

  deleteFeatureFlag(documentId: string): Observable<void> {
    return this.http.delete<void>(this.BILLING_ENDPOINTS.feature_flag_by_id(documentId));
  }

  getFeatureFlagStats(locale: string): Observable<{ data: FeatureFlagStats }> {
    const params = new HttpParams().set('locale', locale);
    return this.http.get<{ data: FeatureFlagStats }>(
      this.BILLING_ENDPOINTS.feature_flags_stats,
      { params }
    );
  }


  // ==================== PRODUCT TYPES ====================

  getProductTypes(): Observable<ProductTypesResponse> {
    const params = new HttpParams()
      .set('pagination[pageSize]', '100')
      .set('sort[0]', 'name:asc');

    return this.http.get<ProductTypesResponse>(this.BILLING_ENDPOINTS.product_types, { params });
  }
}
