import { InjectionToken } from '@angular/core';

export interface IToastService {
  show(config: any): void;
}

export const TOAST_SERVICE = new InjectionToken<IToastService>('TOAST_SERVICE');
