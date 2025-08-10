import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { SuccessModal } from '../../pages/components/v1/partials/modals/success-modal/success-modal';
import { ContactModal } from '../../pages/components/v1/partials/modals/contact-modal/contact-modal';
import { environment } from '../../../environments/environment';

export interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  contact_type: string;
  message?: string;
  company_name: string;
  company_size?: string;
  company_website?: string;
  country: string;
  language?: string;
  source?: string;
  contact_subject?: string;
}

export interface ContactFormOptions {
  contact_types: { value: string; label: string }[];
  company_sizes: { value: string; label: string }[];
  countries: { value: string; label: string }[];
  language: string;
}

export interface ContactResponse {
  message: string;
  data: {
    id: string;
    status: string;
    estimated_response_time: string;
    is_returning_contact: boolean;
    previous_contacts: number;
  };
}

export interface EmailCheckResponse {
  email: string;
  exists: boolean;
  contact_count: number;
  last_contact: any;
  can_contact: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContactModalService {
  private readonly apiUrl = environment.api.fullUrl;
  private http = inject(HttpClient);
  private ngbModal = inject(NgbModal);

  /**
   * Ouvre le modal de contact
   */
  openContactModal(initialData?: any): Observable<any> {
    const modalRef = this.ngbModal.open(ContactModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: 'contact-modal-window',
      modalDialogClass: 'contact-modal-dialog',
    });

    if (initialData) {
      modalRef.componentInstance.initialData = initialData;
    }

    return from(modalRef.result).pipe(
      catchError(dismissed => {
        return of({ cancelled: true, reason: dismissed });
      })
    );
  }

  /**
   * Ouvre le modal de succès
   */
  openSuccessModal(message: string, responseData?: any): NgbModalRef {

    const modalRef = this.ngbModal.open(SuccessModal, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: 'success-modal-window'
    });

    // Passer les données au composant
    modalRef.componentInstance.successMessage = message;
    modalRef.componentInstance.responseData = responseData;
    return modalRef;
  }

  /**
   * Vérifie s'il y a des modaux ouverts
   */
  hasOpenModals(): boolean {
    return this.ngbModal.hasOpenModals();
  }

  /**
   * Ferme tous les modaux
   */
  dismissAll(): void {
    this.ngbModal.dismissAll();
  }

  /**
   * Récupère les options du formulaire de contact (pays, types, etc.)
   */
  getContactFormOptions(lang?: string, country?: string): Observable<ContactFormOptions> {
    let params = new HttpParams();
    if (lang) params = params.set('lang', lang);
    if (country) params = params.set('country', country);

    return this.http.get<ContactFormOptions>(`${this.apiUrl}/public/contact-form-options`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Vérifie la disponibilité d'un email
   */
  checkEmailAvailability(email: string): Observable<EmailCheckResponse> {
    const params = new HttpParams().set('email', email);

    return this.http.get<EmailCheckResponse>(`${this.apiUrl}/public/check-email`, { params })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Soumet le formulaire de contact
   */
  submitContactForm(formData: ContactFormData): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${this.apiUrl}/public/contact-form`, formData)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
}
