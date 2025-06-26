import {Routes} from '@angular/router';
import {HomeComponent} from '../home/home.component';
import {NotFoundComponent} from '../../../modules/errors/not-found/not-found.component';
import {FeaturesComponent} from './features/features.component';
import {CatalogComponent} from './catalog/catalog.component';
import {RightsComponent} from './rights/rights.component';
import {DistributionDeliveryComponent} from './distribution-delivery/distribution-delivery.component';
import {IncomeTrackingComponent} from './income-tracking/income-tracking.component';
import {RoyaltiesComponent} from './royalties/royalties.component';
import {PaymentsComponent} from './payments/payments.component';
import {AnalyticsComponent} from './analytics/analytics.component';
import {StudioComponent} from '../products/studio/studio.component';
import {ConnectComponent} from '../products/connect/connect.component';
import {AboutComponent} from '../company/about/about.component';
import {AntiFraudPolicyComponent} from '../company/anti-fraud-policy/anti-fraud-policy.component';
import {ContactComponent} from '../company/contact/contact.component';
import {PrivacyPolicyComponent} from '../company/privacy-policy/privacy-policy.component';
import {UseConditionComponent} from '../company/use-condition/use-condition.component';

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
  // Error
  {path: '**', component: NotFoundComponent},
]

export {Routing};
