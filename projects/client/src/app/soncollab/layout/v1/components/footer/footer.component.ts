import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../../../core/services/language.service';
import { Language } from '../../../../../core/models/language.model';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit, OnDestroy {

  supportedLanguages: Language[] = [];
  currentLanguage: string = 'fr';
  private destroy$ = new Subject<void>();

  constructor(private languageService: LanguageService) {}

  ngOnInit(): void {
    this.initializeLanguageSelector();
    this.setupLanguageListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialise le sélecteur de langue
   */
  private initializeLanguageSelector(): void {
    this.supportedLanguages = this.languageService.getSupportedLanguages();
    this.currentLanguage = this.languageService.getCurrentLanguage();
  }

  /**
   * Écoute les changements de langue venant d'autres composants
   */
  private setupLanguageListener(): void {
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((language: string) => {
        this.currentLanguage = language;
      });
  }

  /**
   * Gestionnaire de changement de langue depuis le select
   */
  onLanguageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newLanguage = target.value;
    window.scroll(0,0);
    if (newLanguage && newLanguage !== this.currentLanguage) {
      this.languageService.setLanguage(newLanguage);
    }
  }

}
