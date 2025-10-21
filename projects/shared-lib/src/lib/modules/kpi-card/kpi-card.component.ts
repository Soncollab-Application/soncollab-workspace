import {Component, computed, inject, input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';

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
export class KpiCardComponent {
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
    return trend >= 0 ? 'trending_up' : 'trending_down';
  });
}
