import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {Language, LanguageService, Theme, ThemeService} from 'shared-lib';
import {Subject, takeUntil} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-auth',
  imports: [
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth implements OnInit, OnDestroy {

  // Theme properties
  currentLogo: string = '/assets/images/logo/soncollablightlogo.svg';
  isDarkTheme: boolean = false;
  currentTheme: Theme = 'light';

  // Language properties
  supportedLanguages: Language[] = [];
  currentLanguage: string = 'fr';

  private destroy$ = new Subject<void>();



  constructor(private themeService: ThemeService,
              private languageService: LanguageService) {
  }



  ngOnInit(): void {
    this.setupThemeListener();
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private setupThemeListener(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateLogoBasedOnTheme();
        this.updateCurrentTheme();
      });
  }

  private setupLanguageListener(): void {
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((language: string) => {
        this.currentLanguage = language;
      });
  }

  setLanguage(languageCode: string): void {
    if (languageCode && languageCode !== this.currentLanguage) {
      this.languageService.setLanguage(languageCode);
      window.scroll(0, 0);
      this.closeLanguageDropdown();
    }
  }

  private updateCurrentTheme(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  private updateLogoBasedOnTheme(): void {
    this.isDarkTheme = this.themeService.isDarkTheme();

    if (this.isDarkTheme) {
      this.currentLogo = '/assets/images/logo/soncollablightlogo.svg';
    } else {
      this.currentLogo = '/assets/images/logo/soncollabdarklogo.svg';
    }
  }


  private closeLanguageDropdown(): void {
    const dropdownElement = document.querySelector('.language-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (dropdownElement) {
      try {
        const bsDropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
        if (bsDropdown) {
          bsDropdown.hide();
        }
      } catch (error) {
        console.warn('Bootstrap Dropdown instance not found');
      }
      dropdownElement.blur();
    }
  }

  isLanguageActive(languageCode: string): boolean {
    return this.currentLanguage === languageCode;
  }


  getActiveThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'fi-sun';
      case 'dark':
        return 'fi-moon';
      case 'auto':
        return 'fi-monitor';
      default:
        return 'fi-sun';
    }
  }

  getActiveThemeLabel(): string {
    switch (this.currentTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
      default:
        return 'Light';
    }
  }

  setTheme(theme: Theme): void {
    window.scroll(0,0);
    this.themeService.setTheme(theme);
    this.closeThemeDropdown();
  }

  isThemeActive(theme: Theme): boolean {
    return this.currentTheme === theme;
  }

  getCurrentLanguageName(): string {
    const language = this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
    return language?.name || this.currentLanguage.toUpperCase();
  }

  private closeThemeDropdown(): void {
    const dropdownElement = document.querySelector('.theme-switcher[data-bs-toggle="dropdown"]') as HTMLElement;
    if (dropdownElement) {
      try {
        const bsDropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
        if (bsDropdown) {
          bsDropdown.hide();
        }
      } catch (error) {
        console.warn('Bootstrap Dropdown instance not found, using fallback method');
      }
      dropdownElement.blur();
    }
  }

}
