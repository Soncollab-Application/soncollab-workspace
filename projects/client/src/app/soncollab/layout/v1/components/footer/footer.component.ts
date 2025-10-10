import { Component, inject, computed, effect, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, Choice } from 'shared-lib';
import type { ChoiceOption } from 'shared-lib';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe, Choice],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  languageService = inject(LanguageService);
  choiceRef = viewChild<Choice>(Choice);

  currentLanguage = computed(() => this.languageService.currentLanguage());

  languageOptions = computed<ChoiceOption[]>(() =>
    this.languageService.availableLanguages.map(lang => ({
      value: lang.code,
      label: lang.name,
      selected: lang.code === this.currentLanguage()
    }))
  );

  constructor() {
    effect(() => {
      const lang = this.currentLanguage();
      const choice = this.choiceRef();
      if (choice) {
        choice.writeValue(lang);
      }
    });
  }

  onLanguageChange(languageCode: string): void {
    if (languageCode && languageCode !== this.currentLanguage()) {
      this.languageService.changeLanguage(languageCode);
      window.scroll(0, 0);
    }
  }

  getCurrentLogo(): string {
    const theme = document.documentElement.getAttribute('data-bs-theme');
    return theme === 'dark'
      ? '/assets/images/logo/soncollablightlogo.svg'
      : '/assets/images/logo/soncollabdarklogo.svg';
  }
}
