import {Component, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {RouterLink} from '@angular/router';
import {BlogUtils} from '../../../../../utils/blog.utils';
import {BlogArticle} from '../../../../../models/blog.model';

@Component({
  selector: 'app-blog-card',
  imports: [
    TranslatePipe,
    RouterLink
  ],
  templateUrl: './blog-card.html',
  styleUrl: './blog-card.css'
})
export class BlogCard {
  @Input() article!: BlogArticle;
  @Input() showTags: boolean = true;
  @Input() maxTags: number = 3;

  formatDate(date: string): string {
    return BlogUtils.formatDate(date);
  }

  truncateText(text: string, maxLength: number): string {
    return BlogUtils.truncateText(text, maxLength);
  }

  getCategoryColor(categoryName: string): string {
    return BlogUtils.getCategoryColor(categoryName);
  }
}
