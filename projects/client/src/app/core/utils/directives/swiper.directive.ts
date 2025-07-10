import {Directive, ElementRef, Input, OnInit, OnDestroy} from '@angular/core';
import { Swiper } from 'swiper';
import {SwiperOptions} from 'swiper/types';

@Directive({
  selector: '[appSwiper]'
})
export class SwiperDirective implements OnInit, OnDestroy {
  @Input() swiperConfig: SwiperOptions = {};
  private swiper: Swiper | undefined;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    // Importation des modules Swiper nécessaires
    import('swiper/modules').then(({ Navigation , Pagination , Autoplay , EffectCreative , Controller  }) => {
      this.swiper = new Swiper(this.el.nativeElement, {
        ...this.swiperConfig,
        modules: [Navigation , Pagination , Autoplay , EffectCreative , Controller  ]
      });
    });
  }

  ngOnDestroy() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
    }
  }
}
