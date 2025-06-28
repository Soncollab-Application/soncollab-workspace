import {AfterViewInit, Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {ThemeService} from './services/theme.service';
import {AosService} from './services/aos.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit {

  constructor(
    private translate: TranslateService,
    private themeService: ThemeService,
    private aosService: AosService){
    this.initTranslate();

    const storedTheme = this.themeService.getStoredTheme();
    this.themeService.applyPreferences();
    this.themeService.setTheme(storedTheme);
  }

  ngOnInit() {
    this.aosService.initializeAOS();
  }

  ngAfterViewInit(): void {
    this.aosService.initializeAOS();
  }

  private initTranslate() {
    let lang = localStorage.getItem('lang');
    if (!lang) {
      const browserLang = navigator.language?.split('-')[0] || 'fr';
      lang = ['fr', 'en'].includes(browserLang) ? browserLang : 'fr';
      localStorage.setItem('lang', lang);
    }
    this.translate.setDefaultLang('fr');
    this.translate.use(lang);
  }
}
