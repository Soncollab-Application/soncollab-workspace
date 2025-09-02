import {Routes} from '@angular/router';
import {HomeComponent} from './components/v1/home/home.component';
import {CatalogComponent} from './components/v1/features/catalog/catalog.component';
import {RightsComponent} from './components/v1/features/rights/rights.component';
import {DistributionDeliveryComponent} from './components/v1/features/distribution-delivery/distribution-delivery.component';
import {IncomeTrackingComponent} from './components/v1/features/income-tracking/income-tracking.component';
import {RoyaltiesComponent} from './components/v1/features/royalties/royalties.component';
import {PaymentsComponent} from './components/v1/features/payments/payments.component';
import {AnalyticsComponent} from './components/v1/features/analytics/analytics.component';
import {StudioComponent} from './components/v1/products/studio/studio.component';
import {ConnectComponent} from './components/v1/products/connect/connect.component';
import {AboutComponent} from './components/v1/company/about/about.component';
import {AntiFraudPolicyComponent} from './components/v1/company/anti-fraud-policy/anti-fraud-policy.component';
import {PrivacyPolicyComponent} from './components/v1/company/privacy-policy/privacy-policy.component';
import {UseConditionComponent} from './components/v1/company/use-condition/use-condition.component';
import {PricingComponent} from './components/v1/pricing/pricing.component';
import {NotFoundComponent} from './components/v1/errors/not-found/not-found.component';
import {BlogList} from './components/v1/resources/blog/blog-list/blog-list';
import {BlogDetail} from './components/v1/resources/blog/blog-detail/blog-detail';
import {HelpList} from './components/v1/resources/help-center/help-list/help-list';
import {HelpDetail} from './components/v1/resources/help-center/help-detail/help-detail';


const Routing: Routes = [
  {path: '', component: HomeComponent},

  // Features
  {path: 'features/catalog', component: CatalogComponent},
  {path: 'features/rights', component: RightsComponent},
  {path: 'features/distribution-delivery', component: DistributionDeliveryComponent},
  {path: 'features/income-tracking', component: IncomeTrackingComponent},
  {path: 'features/royalties', component: RoyaltiesComponent},
  {path: 'features/payments', component: PaymentsComponent},
  {path: 'features/analytics', component: AnalyticsComponent},

  // Products
  {path: 'products/studio', component: StudioComponent},
  {path: 'products/connect', component: ConnectComponent},

  // Blog routes
  {path: 'blog', component: BlogList},
  {path: 'blog/:slug', component: BlogDetail},

  // Help routes
  {path: 'help', component: HelpList},
  {path: 'help/:slug', component: HelpDetail},
  // Company
  {path: 'company/about', component: AboutComponent},
  {path: 'company/anti-fraud-policy', component: AntiFraudPolicyComponent},
  {path: 'company/privacy-policy', component: PrivacyPolicyComponent},
  {path: 'company/use-condition', component: UseConditionComponent },

  // Other
  {path: 'pricing', component: PricingComponent },

  // Error
  {path: '**', component: NotFoundComponent},
]

export {Routing};
