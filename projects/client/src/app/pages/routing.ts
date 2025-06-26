import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {NotFoundComponent} from '../modules/errors/not-found/not-found.component';
import {FeaturesComponent} from './components/features/features/features.component';
import {CatalogComponent} from './components/features/catalog/catalog.component';
import {RightsComponent} from './components/features/rights/rights.component';
import {DistributionDeliveryComponent} from './components/features/distribution-delivery/distribution-delivery.component';
import {IncomeTrackingComponent} from './components/features/income-tracking/income-tracking.component';
import {RoyaltiesComponent} from './components/features/royalties/royalties.component';
import {PaymentsComponent} from './components/features/payments/payments.component';
import {AnalyticsComponent} from './components/features/analytics/analytics.component';
import {StudioComponent} from './components/products/studio/studio.component';
import {ConnectComponent} from './components/products/connect/connect.component';
import {AboutComponent} from './components/company/about/about.component';
import {AntiFraudPolicyComponent} from './components/company/anti-fraud-policy/anti-fraud-policy.component';
import {ContactComponent} from './components/company/contact/contact.component';
import {PrivacyPolicyComponent} from './components/company/privacy-policy/privacy-policy.component';
import {UseConditionComponent} from './components/company/use-condition/use-condition.component';
import {PricingComponent} from './components/pricing/pricing.component';

const Routing: Routes = [
  {path: '', component: HomeComponent},
  // Features
  {path: 'features', component: FeaturesComponent},
  {path: 'features/catalog', component: CatalogComponent},
  {path: 'features/rights', component: RightsComponent},
  {path: 'features/distribution-delivery', component: DistributionDeliveryComponent},
  {path: 'features/income-tracking', component: IncomeTrackingComponent},
  {path: 'features/royalties', component: RoyaltiesComponent},
  {path: 'features/payments', component: PaymentsComponent},
  {path: 'features/analytics', component: AnalyticsComponent},
  //Products
  {path: 'products/studio', component: StudioComponent},
  {path: 'products/connect', component: ConnectComponent},
  //Company
  {path: 'company/about', component: AboutComponent},
  {path: 'company/anti-fraud-policy', component: AntiFraudPolicyComponent},
  {path: 'company/contact', component: ContactComponent},
  {path: 'company/privacy-policy', component: PrivacyPolicyComponent},
  {path: 'company/use-condition', component: UseConditionComponent },
  //other
  {path: 'pricing', component: PricingComponent },
  // Error
  {path: '**', component: NotFoundComponent},
]

export {Routing};
