import { Injectable } from '@angular/core';
import AOS from 'aos';


@Injectable({
  providedIn: 'root'
})
export class AosService {

  constructor() { }

  initializeAOS() {
    if (typeof AOS === 'undefined') {
      console.error('AOS n\'est pas chargé. Assurez-vous d\'avoir importé AOS dans votre projet.');
      return;
    }
    AOS.init({
      once: true,
    });
  }
}
