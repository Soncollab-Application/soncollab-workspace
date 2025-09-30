import {Component, computed, inject, input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import enTranslations from './i18n/en.json';
import frTranslations from './i18n/fr.json';

export interface KpiData {
  label: string;
  value: string | number;
  icon?: string;
  iconClass?: string;
  trend?: number;
  trendLabel?: string;
  bgClass?: string;
}

@Component({
  selector: 'lib-kpi-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.css']
})
export class KpiCardComponent implements OnInit {
  private translate = inject(TranslateService);

  // Inputs
  data = input.required<KpiData>();
  loading = input<boolean>(false);
  clickable = input<boolean>(false);

  // Computed
  hasTrend = computed(() => this.data().trend !== undefined && this.data().trend !== null);
  trendClass = computed(() => {
    const trend = this.data().trend;
    if (trend === undefined || trend === null) return '';
    return trend >= 0 ? 'text-success' : 'text-danger';
  });
  trendIcon = computed(() => {
    const trend = this.data().trend;
    if (trend === undefined || trend === null) return '';
    return trend >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
  });

  ngOnInit(): void {
    this.translate.setTranslation('en', { kpiCard: enTranslations.kpiCard }, true);
    this.translate.setTranslation('fr', { kpiCard: frTranslations.kpiCard }, true);
  }
}
