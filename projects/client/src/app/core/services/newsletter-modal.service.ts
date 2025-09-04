import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { SuccessModal } from '../../pages/components/v1/partials/modals/success-modal/success-modal';
import { environment } from '../../../environments/environment';
import {NewsletterModal} from '../../pages/components/v1/partials/modals/newsletter-modal/newsletter-modal';

export interface NewsletterSubscriptionData {
  email: string;
  first_name?: string;
  subscription_type: 'blog' | 'product_updates' | 'general' | 'help';
  source?: string;
}

export interface NewsletterResponse {
  message: string;
  data: {
    id: string;
    email: string;
    subscription_type: string;
    subscription_state: string;
    subscribed_at: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NewsletterModalService {
  private readonly apiUrl = environment.api.fullUrl;
  private http = inject(HttpClient);
  private ngbModal = inject(NgbModal);

  /**
   * Ouvre le modal newsletter
   */
  openNewsletterModal(subscriptionType: string, source?: string): Observable<any> {
    const modalRef = this.ngbModal.open(NewsletterModal, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: 'newsletter-modal-window',
      modalDialogClass: 'newsletter-modal-dialog',
    });

    // Passer les données initiales
    modalRef.componentInstance.subscriptionType = subscriptionType;
    modalRef.componentInstance.source = source;

    return from(modalRef.result).pipe(
      catchError(dismissed => {
        return of({ cancelled: true, reason: dismissed });
      })
    );
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
   * Soumet l'abonnement newsletter
   */
  subscribeToNewsletter(subscriptionData: NewsletterSubscriptionData): Observable<NewsletterResponse> {
    // Ajouter les données par défaut
    const formData = {
      ...subscriptionData,
      subscribed_at: new Date().toISOString(),
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent
    };

    return this.http.post<NewsletterResponse>(`${this.apiUrl}/newsletter/subscribe`, formData)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Se désabonner de la newsletter
   */
  unsubscribeFromNewsletter(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/newsletter/unsubscribe`, { email })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Récupère l'IP du client (simplifiée)
   */
  private getClientIP(): string {
    // En production, vous pourriez utiliser un service tiers ou récupérer l'IP côté serveur
    return '';
  }
}
