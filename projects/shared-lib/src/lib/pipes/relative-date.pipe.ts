import { Pipe, PipeTransform, inject, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { RelativeDateService } from '../services';

@Pipe({
  name: 'relativeDate',
  standalone: true,
  pure: false
})
export class RelativeDatePipe implements PipeTransform, OnDestroy {
  private translate = inject(TranslateService);
  private relativeDateService = inject(RelativeDateService);
  private destroy$ = new Subject<void>();
  private currentLang: string;

  constructor() {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang;

    this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  transform(value: string | Date | null | undefined): string {
    const _ = this.currentLang;
    return this.relativeDateService.formatRelativeDate(value);
  }
}
