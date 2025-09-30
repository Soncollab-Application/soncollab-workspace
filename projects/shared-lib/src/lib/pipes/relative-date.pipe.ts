import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';
import {inject, OnDestroy, OnInit, Pipe, PipeTransform} from '@angular/core';
import {Subject} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';

@Pipe({
  name: 'relativeDate',
  standalone: true,
  pure: false
})
export class RelativeDatePipe implements PipeTransform, OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();
  private initialized = false;

  ngOnInit(): void {
    if (!this.initialized) {
      this.translate.setTranslation('en', { relativeDate: enTranslations.relativeDate }, true);
      this.translate.setTranslation('fr', { relativeDate: frTranslations.relativeDate }, true);
      this.initialized = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  transform(value: string | Date): string {
    // Initialize translations if not already done
    if (!this.initialized) {
      this.ngOnInit();
    }

    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return this.translate.instant('relativeDate.justNow');
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const key = minutes === 1 ? 'relativeDate.minuteAgo' : 'relativeDate.minutesAgo';
      return this.translate.instant(key, { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const key = hours === 1 ? 'relativeDate.hourAgo' : 'relativeDate.hoursAgo';
      return this.translate.instant(key, { count: hours });
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      const key = days === 1 ? 'relativeDate.dayAgo' : 'relativeDate.daysAgo';
      return this.translate.instant(key, { count: days });
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      const key = weeks === 1 ? 'relativeDate.weekAgo' : 'relativeDate.weeksAgo';
      return this.translate.instant(key, { count: weeks });
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      const key = months === 1 ? 'relativeDate.monthAgo' : 'relativeDate.monthsAgo';
      return this.translate.instant(key, { count: months });
    }

    const years = Math.floor(days / 365);
    const key = years === 1 ? 'relativeDate.yearAgo' : 'relativeDate.yearsAgo';
    return this.translate.instant(key, { count: years });
  }
}
