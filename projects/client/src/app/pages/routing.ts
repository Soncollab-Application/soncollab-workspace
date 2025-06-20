import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {NotFoundComponent} from '../modules/errors/not-found/not-found.component';

const Routing: Routes = [
  { path: '', component: HomeComponent },
  { path: '**', component: NotFoundComponent }
]

export { Routing };
