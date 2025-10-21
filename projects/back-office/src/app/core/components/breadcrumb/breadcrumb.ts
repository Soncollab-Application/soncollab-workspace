import {Component, computed, inject, Input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PageTitleService} from '../../services/page-title.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css'
})
export class Breadcrumb {
  @Input() icon?: string;
  @Input() showAvatar: boolean = false;
  @Input() avatarContent?: string;
  @Input() hasMobileActions: boolean = false;

  private pageTitleService = inject(PageTitleService);

  breadcrumbs = computed(() => this.pageTitleService.breadcrumbs());
  currentTitle = computed(() => this.pageTitleService.currentTitle());

  getPreviousBreadcrumb() {
    const crumbs = this.breadcrumbs();
    if (crumbs.length <= 1) return null;

    for (let i = crumbs.length - 2; i >= 0; i--) {
      if (crumbs[i].route) {
        return crumbs[i];
      }
    }

    return null;
  }
}
