import { Injectable } from '@angular/core';

declare var Swiper: any;

@Injectable({
  providedIn: 'root'
})
export class SwiperInitializerService {
  initSwipers(): void {
    const elements = document.querySelectorAll('[data-swiper]');
    console.log('Initializing Swipers for elements:', elements);
    elements.forEach((el: Element) => {
      const dataset = (el as HTMLElement).dataset;
      if (dataset['swiper']) {
        try {
          const options = JSON.parse(dataset['swiper']);
          new Swiper(el, options);
        } catch (e) {
          console.error('data-swiper JSON error:', e);
        }
      }
    });
  }
}
