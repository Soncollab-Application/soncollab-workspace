import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class RelativeDateService {
  private translate = inject(TranslateService);

  formatRelativeDate(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;

    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return this.translate.instant('relativeDateShared.justNow');
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const key = minutes === 1 ? 'relativeDateShared.minuteAgo' : 'relativeDateShared.minutesAgo';
      return this.translate.instant(key, { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const key = hours === 1 ? 'relativeDateShared.hourAgo' : 'relativeDateShared.hoursAgo';
      return this.translate.instant(key, { count: hours });
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      const key = days === 1 ? 'relativeDateShared.dayAgo' : 'relativeDateShared.daysAgo';
      return this.translate.instant(key, { count: days });
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      const key = weeks === 1 ? 'relativeDateShared.weekAgo' : 'relativeDateShared.weeksAgo';
      return this.translate.instant(key, { count: weeks });
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      const key = months === 1 ? 'relativeDateShared.monthAgo' : 'relativeDateShared.monthsAgo';
      return this.translate.instant(key, { count: months });
    }

    const years = Math.floor(days / 365);
    const key = years === 1 ? 'relativeDateShared.yearAgo' : 'relativeDateShared.yearsAgo';
    return this.translate.instant(key, { count: years });
  }
}
