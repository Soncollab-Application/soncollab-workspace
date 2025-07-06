import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {PageService} from '../../../services/page.service';
import {Hero} from '../../../models/hero.model';
import {LanguageService} from '../../../../core/services/language.service';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [
    TranslatePipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  hero: Hero | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private pageService: PageService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.setupLanguageListener();
    this.loadHeroData();
  }


  private setupLanguageListener(): void {
    this.languageService.onLanguageChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newLanguage: string) => {
        this.loadHeroData(); // Recharger les données du hero
      });
  }

  private loadHeroData(): void {
    this.isLoading = true;

    this.pageService.getHero()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hero) => {
          this.hero = hero;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du hero:', error);
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
