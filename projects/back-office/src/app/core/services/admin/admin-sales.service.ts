import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  SalesContact,
  SalesContactListResponse,
  ContactFilters,
  ContactStats,
  ContactFormOptions
} from '../../models/sales/sales-contact.model';
import {SalesRepresentative} from '../../models/auth.model';
import {QuotaFilters, QuotaStats, SalesQuota, SalesQuotaListResponse} from '../../models/sales/sales-quota.model';

@Injectable({ providedIn: 'root' })
export class AdminSalesService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.api.fullUrl;

  private readonly SALES_ENDPOINTS = {
    // Contacts
    contacts: `${this.API_URL}/sales-contacts`,
    contact_by_id: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}`,
    contact_stats: `${this.API_URL}/sales-contacts/stats`,

    // Actions spécifiques
    qualified: `${this.API_URL}/sales-contacts/qualified`,
    unassigned: `${this.API_URL}/sales-contacts/unassigned`,
    inbound_queue: `${this.API_URL}/sales-contacts/inbound-queue`,
    assignment_stats: `${this.API_URL}/sales-contacts/assignment-stats`,
    available_reps: `${this.API_URL}/sales-contacts/available-reps`,

    // Operations
    assign: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}/assign`,
    unassign: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}/unassign`,
    reassign: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}/reassign`,
    qualify: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}/qualify`,
    convert: (documentId: string) => `${this.API_URL}/sales-contacts/${documentId}/convert-to-prospect`,

    // Formulaires
    create_inbound: `${this.API_URL}/sales-contacts/inbound`,
    form_options: (lang: string) => `${this.API_URL}/public/contact-form-options?lang=${lang}`,

    // Quotas
    quotas: `${this.API_URL}/sales-quotas`,
    quota_by_id: (documentId: string) => `${this.API_URL}/sales-quotas/${documentId}`,
    quota_stats: `${this.API_URL}/sales-quotas/quota-dashboard`,
  };

  // GET ALL CONTACTS
  getContacts(
    page = 1,
    pageSize = 25,
    filters?: ContactFilters,
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Observable<SalesContactListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString());

    // Mapper les champs de tri pour Strapi
    if (sortField) {
      const sortFieldMap: Record<string, string> = {
        'first_name': 'first_name',
        'last_name': 'last_name',
        'email': 'email',
        'company_name': 'company_name',
        'createdAt': 'createdAt',
        'updatedAt': 'updatedAt',
        'lead_score': 'lead_score',
        'urgency_level': 'urgency_level',
        'sales_contact_status': 'sales_contact_status'
      };

      const mappedField = sortFieldMap[sortField] || sortField;
      params = params.set('sort[0]', `${mappedField}:${sortDirection}`);
    }

    // Populate relations - SIMPLIFIÉ (uniquement ce qui existe)
    params = params.set('populate[0]', 'assigned_to');
    params = params.set('populate[1]', 'territory_assigned');
    params = params.set('populate[2]', 'country');

    // Filtres de recherche
    if (filters?.search) {
      const searchTerms = filters.search.trim().split(' ').filter(term => term.length > 0);

      if (searchTerms.length === 1) {
        params = params.set('filters[$or][0][email][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][1][first_name][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][2][last_name][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][3][company_name][$containsi]', searchTerms[0]);
      } else if (searchTerms.length === 2) {
        params = params.set('filters[$or][0][$and][0][first_name][$containsi]', searchTerms[0]);
        params = params.set('filters[$or][0][$and][1][last_name][$containsi]', searchTerms[1]);

        params = params.set('filters[$or][1][$and][0][first_name][$containsi]', searchTerms[1]);
        params = params.set('filters[$or][1][$and][1][last_name][$containsi]', searchTerms[0]);

        params = params.set('filters[$or][2][email][$containsi]', filters.search);
        params = params.set('filters[$or][3][company_name][$containsi]', filters.search);
      } else {
        params = params.set('filters[$or][0][email][$containsi]', filters.search);
        params = params.set('filters[$or][1][company_name][$containsi]', filters.search);
      }
    }

    // Filtre par statut
    if (filters?.status) {
      params = params.set('filters[sales_contact_status][$eq]', filters.status);
    }

    // Filtre par type de contact
    if (filters?.contact_type) {
      params = params.set('filters[contact_type][$eq]', filters.contact_type);
    }

    // Filtre par urgence
    if (filters?.urgency) {
      params = params.set('filters[urgency_level][$eq]', filters.urgency);
    }

    // Filtre par assignation
    if (filters?.assigned !== undefined) {
      if (filters.assigned) {
        params = params.set('filters[assigned_to][$notNull]', 'true');
      } else {
        params = params.set('filters[assigned_to][$null]', 'true');
      }
    }

    // Filtre par territoire
    if (filters?.territory) {
      params = params.set('filters[territory_assigned][documentId][$eq]', filters.territory);
    }

    // Filtre par taille d'entreprise
    if (filters?.company_size) {
      params = params.set('filters[company_size][$eq]', filters.company_size);
    }

    // Filtre par type d'assignation
    if (filters?.assignment_type) {
      params = params.set('filters[assignment_type][$eq]', filters.assignment_type);
    }

    return this.http.get<SalesContactListResponse>(this.SALES_ENDPOINTS.contacts, { params });
  }

  // GET CONTACT BY ID
  getContactById(documentId: string): Observable<{ data: SalesContact }> {
    let params = new HttpParams();

    // Populate simplifié - uniquement ce qui existe
    params = params.set('populate[0]', 'assigned_to');
    params = params.set('populate[1]', 'territory_assigned');
    params = params.set('populate[2]', 'country');

    return this.http.get<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.contact_by_id(documentId),
      { params }
    );
  }

  // GET STATS
  getContactStats(): Observable<ContactStats> {
    return this.http.get<{ data: ContactStats }>(this.SALES_ENDPOINTS.contact_stats)
      .pipe(map(response => response.data));
  }

  // GET FORM OPTIONS
  getContactFormOptions(lang: string = 'fr'): Observable<ContactFormOptions> {
    return this.http.get<ContactFormOptions>(this.SALES_ENDPOINTS.form_options(lang));
  }

  // UPDATE CONTACT
  updateContact(documentId: string, data: Partial<SalesContact>): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.contact_by_id(documentId),
      { data }
    );
  }

  // DELETE CONTACT
  deleteContact(documentId: string): Observable<void> {
    return this.http.delete<void>(this.SALES_ENDPOINTS.contact_by_id(documentId));
  }

  // ASSIGN CONTACT
  assignContact(documentId: string, userId: string): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.assign(documentId),
      { sales_rep_id: userId }
    );
  }

  // UNASSIGN CONTACT
  unassignContact(documentId: string): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.unassign(documentId),
      {}
    );
  }

  // REASSIGN CONTACT
  reassignContact(documentId: string, userId: string): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.reassign(documentId),
      { new_sales_rep_id: userId }
    );
  }

  // QUALIFY CONTACT
  qualifyContact(
    documentId: string,
    qualificationData: {
      sales_contact_status: string;
      company_size?: string;
      estimated_annual_revenue?: number;
      urgency_level: string;
      prospection_notes?: string;
    }
  ): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.qualify(documentId),
      qualificationData
    );
  }

  // CONVERT TO PROSPECT
  convertToProspect(documentId: string): Observable<{ data: SalesContact }> {
    return this.http.put<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.convert(documentId),
      {}
    );
  }

  // GET QUALIFIED CONTACTS
  getQualifiedContacts(): Observable<SalesContactListResponse> {
    let params = new HttpParams();

    params = params.set('populate[assigned_to][fields][0]', 'first_name');
    params = params.set('populate[assigned_to][fields][1]', 'last_name');
    params = params.set('populate[assigned_to][fields][2]', 'email');
    params = params.set('populate[territory_assigned]', '*');
    params = params.set('populate[country]', '*');

    return this.http.get<SalesContactListResponse>(this.SALES_ENDPOINTS.qualified, { params });
  }

  // GET UNASSIGNED CONTACTS
  getUnassignedContacts(): Observable<SalesContactListResponse> {
    return this.http.get<SalesContactListResponse>(this.SALES_ENDPOINTS.unassigned);
  }

  // GET INBOUND QUEUE
  getInboundQueue(): Observable<SalesContactListResponse> {
    return this.http.get<SalesContactListResponse>(this.SALES_ENDPOINTS.inbound_queue);
  }

  // GET AVAILABLE REPS - Typage correct pour les modals
  getAvailableReps(): Observable<{ data: SalesRepresentative[] }> {
    return this.http.get<{ data: SalesRepresentative[] }>(this.SALES_ENDPOINTS.available_reps);
  }

  // GET ASSIGNMENT STATS
  getAssignmentStats(): Observable<any> {
    return this.http.get(this.SALES_ENDPOINTS.assignment_stats);
  }

  // CREATE INBOUND CONTACT
  createInboundContact(data: Partial<SalesContact>): Observable<{ data: SalesContact }> {
    return this.http.post<{ data: SalesContact }>(
      this.SALES_ENDPOINTS.create_inbound,
      data
    );
  }



  // GET ALL QUOTAS
  getQuotas(
    page = 1,
    pageSize = 25,
    filters?: QuotaFilters,
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Observable<SalesQuotaListResponse> {
    let params = new HttpParams()
      .set('pagination[page]', page.toString())
      .set('pagination[pageSize]', pageSize.toString());

    if (sortField) {
      params = params.set('sort[0]', `${sortField}:${sortDirection}`);
    }

    // Populate
    params = params.set('populate[sales_rep][fields][0]', 'first_name');
    params = params.set('populate[sales_rep][fields][1]', 'last_name');
    params = params.set('populate[sales_rep][fields][2]', 'email');
    params = params.set('populate[target_countries][fields][0]', 'name');
    params = params.set('populate[target_countries][fields][1]', 'code');

    // Filters
    if (filters?.search) {
      params = params.set('filters[$or][0][sales_rep][email][$containsi]', filters.search);
      params = params.set('filters[$or][1][sales_rep][first_name][$containsi]', filters.search);
      params = params.set('filters[$or][2][sales_rep][last_name][$containsi]', filters.search);
    }

    if (filters?.quota_type) {
      params = params.set('filters[quota_type][$eq]', filters.quota_type);
    }

    if (filters?.is_active !== undefined) {
      params = params.set('filters[is_active][$eq]', filters.is_active.toString());
    }

    if (filters?.sales_rep) {
      params = params.set('filters[sales_rep][documentId][$eq]', filters.sales_rep);
    }

    return this.http.get<SalesQuotaListResponse>(this.SALES_ENDPOINTS.quotas, { params });
  }

  // GET QUOTA BY ID
  getQuotaById(documentId: string): Observable<{ data: SalesQuota }> {
    let params = new HttpParams();

    params = params.set('populate[0]', 'sales_rep');
    params = params.set('populate[1]', 'target_countries');

    return this.http.get<{ data: SalesQuota }>(
      this.SALES_ENDPOINTS.quota_by_id(documentId),
      { params }
    );
  }

  // GET QUOTA STATS
  getQuotaStats(): Observable<{ data: QuotaStats }> {
    return this.http.get<{ data: QuotaStats }>(this.SALES_ENDPOINTS.quota_stats);
  }

  // UPDATE QUOTA
  updateQuota(documentId: string, data: Partial<SalesQuota>): Observable<{ data: SalesQuota }> {
    return this.http.put<{ data: SalesQuota }>(
      this.SALES_ENDPOINTS.quota_by_id(documentId),
      { data }
    );
  }

  // DELETE QUOTA
  deleteQuota(documentId: string): Observable<void> {
    return this.http.delete<void>(this.SALES_ENDPOINTS.quota_by_id(documentId));
  }



}
