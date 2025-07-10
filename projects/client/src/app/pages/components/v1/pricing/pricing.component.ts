import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import {LanguageService} from '../../../../core/services/language.service';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  maxAssets: number;
  maxRoyalties: number;
  support: string;
  whiteLabel: boolean;
  highlighted?: boolean;
  modules: string[];
  features: string[];
}

interface PricingSection {
  id: string;
  titleKey: string;
  descriptionKey: string;
  plans: PricingPlan[];
}

@Component({
  selector: 'app-pricing',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {

  private destroy$ = new Subject<void>();
  currentLanguage: string = 'fr';

  pricingSections: PricingSection[] = [
    {
      id: 'portal',
      titleKey: 'pricing.portal.title',
      descriptionKey: 'pricing.portal.description',
      plans: [
        {
          id: 'start',
          name: 'Start',
          price: 249,
          currency: '€',
          period: '/mois',
          maxAssets: 3000,
          maxRoyalties: 25000,
          support: '72h',
          whiteLabel: false,
          modules: ['Catalog', 'Distribution', 'Analytics'],
          features: [
            'pricing.portal.start.feature1',
            'pricing.portal.start.feature2',
            'pricing.portal.start.feature3',
            'pricing.portal.start.feature4'
          ]
        },
        {
          id: 'growth',
          name: 'Growth',
          price: 649,
          currency: '€',
          period: '/mois',
          maxAssets: 10000,
          maxRoyalties: 60000,
          support: '48h',
          whiteLabel: true,
          highlighted: true,
          modules: ['Rights', 'Payments', 'Royalty Reporting'],
          features: [
            'pricing.portal.growth.feature1',
            'pricing.portal.growth.feature2',
            'pricing.portal.growth.feature3',
            'pricing.portal.growth.feature4',
            'pricing.portal.growth.feature5'
          ]
        },
        {
          id: 'pro-label',
          name: 'Pro Label',
          price: 1199,
          currency: '€',
          period: '/mois',
          maxAssets: 25000,
          maxRoyalties: 120000,
          support: '24h',
          whiteLabel: true,
          modules: ['Publishing', 'Sync Licensing', 'Team Collaboration'],
          features: [
            'pricing.portal.prolabel.feature1',
            'pricing.portal.prolabel.feature2',
            'pricing.portal.prolabel.feature3',
            'pricing.portal.prolabel.feature4',
            'pricing.portal.prolabel.feature5'
          ]
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 3500,
          currency: '€',
          period: '/mois',
          maxAssets: 100000,
          maxRoyalties: 350000,
          support: 'Prioritaire',
          whiteLabel: true,
          modules: ['API Access', 'Priority SLA', 'Legal module', 'AI/Anomalies'],
          features: [
            'pricing.portal.enterprise.feature1',
            'pricing.portal.enterprise.feature2',
            'pricing.portal.enterprise.feature3',
            'pricing.portal.enterprise.feature4',
            'pricing.portal.enterprise.feature5'
          ]
        }
      ]
    },
    {
      id: 'api',
      titleKey: 'pricing.api.title',
      descriptionKey: 'pricing.api.description',
      plans: [
        {
          id: 'delivery-analytics',
          name: 'Delivery & Analytics',
          price: 1250,
          currency: '€',
          period: '/mois',
          maxAssets: 25000,
          maxRoyalties: 120000,
          support: '48h',
          whiteLabel: false,
          modules: ['Catalog', 'Distribution', 'Analytics'],
          features: [
            'pricing.api.delivery.feature1',
            'pricing.api.delivery.feature2',
            'pricing.api.delivery.feature3',
            'pricing.api.delivery.feature4'
          ]
        },
        {
          id: 'rights-royalties',
          name: 'Rights & Royalties',
          price: 2500,
          currency: '€',
          period: '/mois',
          maxAssets: 50000,
          maxRoyalties: 250000,
          support: '24h',
          whiteLabel: false,
          highlighted: true,
          modules: ['Rights', 'Revenue', 'Legal', 'Publishing', 'Payments'],
          features: [
            'pricing.api.rights.feature1',
            'pricing.api.rights.feature2',
            'pricing.api.rights.feature3',
            'pricing.api.rights.feature4',
            'pricing.api.rights.feature5'
          ]
        },
        {
          id: 'full-api',
          name: 'Full API Suite',
          price: 5000,
          currency: '€',
          period: '/mois',
          maxAssets: 100000,
          maxRoyalties: 490000,
          support: '24h + SLA',
          whiteLabel: false,
          modules: ['Tous les modules', 'Sandbox'],
          features: [
            'pricing.api.full.feature1',
            'pricing.api.full.feature2',
            'pricing.api.full.feature3',
            'pricing.api.full.feature4',
            'pricing.api.full.feature5'
          ]
        }
      ]
    }
  ];

  constructor() {}

  ngOnInit(): void {
  }

  formatNumber(num: number): string {
    return num.toLocaleString(this.currentLanguage === 'fr' ? 'fr-FR' : 'en-US');
  }

  formatPrice(price: number): string {
    return price.toLocaleString(this.currentLanguage === 'fr' ? 'fr-FR' : 'en-US');
  }

  onSelectPlan(planId: string): void {
    console.log(`Plan sélectionné: ${planId}`);
    // Ici vous pouvez ajouter la logique de redirection ou d'action
  }

  onContactSales(): void {
    console.log('Contact des ventes');
    // Ici vous pouvez ajouter la logique de contact
  }
}
