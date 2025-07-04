import {AfterViewInit, Component, OnInit, OnDestroy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ThemeService} from './core/services/theme.service';
import {AosService} from './core/services/aos.service';
import {LanguageService} from './core/services/language.service';
import { Subject, takeUntil } from 'rxjs';
import {PageService} from './pages/services/page.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    private themeService: ThemeService,
    private aosService: AosService,
    private languageService: LanguageService,
    private pageService: PageService,
  ) {
    this.initializeServices();
  }

  ngOnInit() {
    this.aosService.initializeAOS();
    this.setupLanguageListener();
    this.pageService.preloadHeroForAllLanguages();
  }

  ngAfterViewInit(): void {
    this.aosService.initializeAOS();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialise les services de base
   */
  private initializeServices(): void {
    // Configuration du thème
    const storedTheme = this.themeService.getStoredTheme();
    this.themeService.applyPreferences();
    this.themeService.setTheme(storedTheme);
  }

  /**
   * Écoute les changements de langue
   */
  private setupLanguageListener(): void {
    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newLanguage: string) => {
        //console.log(`🔄 Application: Langue changée vers ${newLanguage}`);
        // Ici vous pouvez ajouter d'autres actions lors du changement de langue
        // Par exemple : recharger certaines données, mettre à jour l'URL, etc.
      });
  }

}
