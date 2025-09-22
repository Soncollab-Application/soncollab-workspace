import {AfterViewInit, Component, OnInit, OnDestroy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { Subject } from 'rxjs';
import {
  AosService,
  LanguageOrchestratorService,
  LanguageService,
  ThemeService,
  ToastContainerComponent
} from 'shared-lib';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    private themeService: ThemeService,
    private aosService: AosService,
    private languageService: LanguageService,
    private languageOrchestrator: LanguageOrchestratorService
  ) {
    this.initializeServices();
  }

  ngOnInit() {
    this.aosService.initializeAOS();
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



}
