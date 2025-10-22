import { AfterViewInit, Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import {AosService, LanguageService, ModalAccessibilityDirective, ThemeService, Toast} from 'shared-lib';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ModalAccessibilityDirective],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private themeService: ThemeService,
    private aosService: AosService,
    private languageService: LanguageService) {
  }

  ngOnInit(): void {
    this.aosService.initializeAOS();
  }

  ngAfterViewInit(): void {
    this.aosService.initializeAOS();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
