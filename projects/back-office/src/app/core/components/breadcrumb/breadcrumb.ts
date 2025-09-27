import {Component, inject} from '@angular/core';
import {PageTitleService} from '../../services/page-title.service';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  imports: [
    RouterLink
  ],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css'
})
export class Breadcrumb {
  private pageTitleService = inject(PageTitleService);
  breadcrumbs = this.pageTitleService.breadcrumbs;
}
