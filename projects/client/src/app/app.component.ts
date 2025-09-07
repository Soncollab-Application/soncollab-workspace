import {AfterViewInit, Component, OnInit, OnDestroy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ThemeService} from './core/services/theme.service';
import {AosService} from './core/services/aos.service';
import {LanguageService} from './core/services/language.service';
import { Subject, takeUntil } from 'rxjs';
import {ToastContainerComponent} from './core/modules/toast/toast-container.component';
import {LanguageOrchestratorService} from './core/services/language-orchestrator.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
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
