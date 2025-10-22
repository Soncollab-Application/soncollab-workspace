import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import {AosService, LanguageService, ModalAccessibilityDirective, ThemeService, Toast} from 'shared-lib';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ModalAccessibilityDirective],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.css'
})
export class App implements OnInit, AfterViewInit, OnDestroy {
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
