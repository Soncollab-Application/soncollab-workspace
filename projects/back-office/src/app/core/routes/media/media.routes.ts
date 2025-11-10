import {Layout} from '../../../soncollab/layout/layout';
import {Routes} from '@angular/router';

export const mediaRoutes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        loadComponent: () => import('../../../pages/media/media-library/media-library').then(c => c.MediaLibrary)
      }
    ]
  }
];
