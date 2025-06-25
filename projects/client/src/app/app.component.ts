import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {ThemeService} from './theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  constructor(
    private translate: TranslateService,
    private themeService: ThemeService) {
    this.initTranslate();

    const storedTheme = this.themeService.getStoredTheme();
    this.themeService.applyPreferences();
    this.themeService.setTheme(storedTheme);
  }

  ngOnInit() {

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
