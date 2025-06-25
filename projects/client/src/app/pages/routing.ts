import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {NotFoundComponent} from '../modules/errors/not-found/not-found.component';
import {FeaturesComponent} from './components/features/features/features.component';

const Routing: Routes = [
  {path: '', component: HomeComponent},
  {path: '**', component: NotFoundComponent},
  {path: 'features', component: FeaturesComponent}
]

export {Routing};
