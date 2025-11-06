import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Choice, ChoiceOption, ChoiceConfig, ToastService } from 'shared-lib';
import { Subject, takeUntil, filter } from 'rxjs';
import { MarkdownModule } from 'ngx-markdown';
import { Offcanvas } from 'bootstrap';
import {BlogCategoryFilters} from '../../../models/content/blog-category.model';
import {BlogArticleOffcanvasService} from '../../../services/admin/blog-article-offcanvas.service';
import {AdminContentService} from '../../../services/admin/admin-content.service';

@Component({
  selector: 'app-blog-article-offcanvas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MarkdownModule,
    Choice,
    FormsModule,
  ],
  templateUrl: './blog-article-offcanvas.html',
  styleUrl: './blog-article-offcanvas.css'
})
export class BlogArticleOffcanvas implements OnInit, OnDestroy {
  @ViewChild('offcanvasElement', { static: true }) offcanvasElement!: ElementRef;

  private offcanvasService = inject(BlogArticleOffcanvasService);
  private contentService = inject(AdminContentService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  private offcanvasInstance: Offcanvas | null = null;

  isOpen = signal(false);
  mode = signal<'create' | 'edit'>('create');
  locale = signal('fr');
  articleId = signal<string | undefined>(undefined);
  loading = signal(false);
  saving = signal(false);

  activeTab = signal<'content' | 'seo'>('content');
  showPreview = signal(false);

  articleForm!: FormGroup;

  categories = signal<any[]>([]);

  title = computed(() =>
    this.mode() === 'create'
      ? this.translate.instant('blog-article-offcanvas.new_article')
      : this.translate.instant('blog-article-offcanvas.edit_article')
  );

  categoryOptions = computed<ChoiceOption[]>(() =>
    this.categories().map(cat => ({
      value: cat.documentId,
      label: cat.name
    }))
  );

  statusOptions = computed<ChoiceOption[]>(() => [
    { value: 'draft', label: this.translate.instant('blog-article-offcanvas.statuses.draft') },
    { value: 'pending_review', label: this.translate.instant('blog-article-offcanvas.statuses.pending_review') },
    { value: 'approved', label: this.translate.instant('blog-article-offcanvas.statuses.approved') },
  ]);

  categoryConfig: ChoiceConfig = {
    searchEnabled: true,
    allowHTML: false,
    itemSelectText: '',
    placeholder: true,
    placeholderValue: this.translate.instant('blog-article-offcanvas.select_category'),
  };

  statusConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
  };

  ngOnInit(): void {
    this.initForm();
    this.setupOffcanvasListener();

    this.offcanvasInstance = new Offcanvas(this.offcanvasElement.nativeElement, {
      backdrop: 'static',
      keyboard: false,
      scroll: false,
    });

    // Écouter la fermeture du backdrop
    this.offcanvasElement.nativeElement.addEventListener('hidden.bs.offcanvas', () => {
      if (this.isOpen()) {
        this.close('cancelled');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.offcanvasInstance?.dispose();
  }

  private initForm(): void {
    this.articleForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', [Validators.required]],
      excerpt: ['', [Validators.maxLength(300)]],
      content: ['', [Validators.required]],
      category: [null, [Validators.required]],
      is_featured: [false],
      reading_time: [0],

      // SEO
      seo_title: ['', [Validators.maxLength(60)]],
      seo_description: ['', [Validators.maxLength(160)]],
      seo_keywords: [''],
      canonical_url: [''],

      // Status
      content_status: ['draft']
    });

    // Auto-generate slug from title
    this.articleForm.get('title')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(title => {
        if (this.mode() === 'create' && title) {
          const slug = this.generateSlug(title);
          this.articleForm.patchValue({ slug }, { emitEvent: false });
        }
      });

    // Auto-calculate reading time from content
    this.articleForm.get('content')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => {
        if (content) {
          const words = content.split(/\s+/).length;
          const readingTime = Math.ceil(words / 200); // 200 words per minute
          this.articleForm.patchValue({ reading_time: readingTime }, { emitEvent: false });
        }
      });
  }

  private setupOffcanvasListener(): void {
    this.offcanvasService.data$
      .pipe(
        takeUntil(this.destroy$),
        filter(data => data !== null)
      )
      .subscribe(data => {
        if (!data) return;

        this.mode.set(data.mode);
        this.locale.set(data.locale);
        this.articleId.set(data.articleId);
        this.activeTab.set('content');
        this.showPreview.set(false);

        this.loadCategories();

        if (data.mode === 'edit' && data.articleId) {
          this.loadArticle(data.articleId);
        } else {
          this.articleForm.reset({
            is_featured: false,
            content_status: 'draft',
            reading_time: 0
          });
        }

        this.open();
      });
  }

  private loadCategories(): void {
    const filters: BlogCategoryFilters = {
      locale: this.locale()
    };

    this.contentService.getBlogCategories(1, 100, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categories.set(response.data);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories.set([]);
        }
      });
  }

  private loadArticle(documentId: string): void {
    this.loading.set(true);

    this.contentService.getBlogArticleById(documentId, this.locale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          const article = response.data;

          this.articleForm.patchValue({
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            content: article.content,
            category: article.category?.documentId,
            is_featured: article.is_featured,
            reading_time: article.reading_time,
            seo_title: article.seo_title,
            seo_description: article.seo_description,
            seo_keywords: article.seo_keywords,
            canonical_url: article.canonical_url,
            content_status: article.content_status
          });
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.showError(this.translate.instant('blog-article-offcanvas.messages.error_loading'));
          this.close('cancelled');
        }
      });
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  open(): void {
    this.isOpen.set(true);
    this.offcanvasInstance?.show();
  }

  close(action: 'saved' | 'cancelled'): void {
    this.isOpen.set(false);
    this.offcanvasInstance?.hide();

    setTimeout(() => {
      this.offcanvasService.close({ action });
    }, 300);
  }

  onSubmit(): void {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      this.toast.showWarning(this.translate.instant('blog-article-offcanvas.messages.fill_required'));
      return;
    }

    this.saving.set(true);
    const formValue = this.articleForm.value;

    const payload = {
      ...formValue,
      locale: this.locale()
    };

    const request = this.mode() === 'create'
      ? this.contentService.createBlogArticle(payload)
      : this.contentService.updateBlogArticle(this.articleId()!, payload);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.showSuccess(
            this.translate.instant(
              this.mode() === 'create'
                ? 'blog-article-offcanvas.messages.created'
                : 'blog-article-offcanvas.messages.updated'
            )
          );
          this.close('saved');
        },
        error: (error) => {
          this.saving.set(false);
          this.toast.showError(this.translate.instant('blog-article-offcanvas.messages.error_saving'));
        }
      });
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  setActiveTab(tab: 'content' | 'seo'): void {
    this.activeTab.set(tab);
  }

  onCategoryChange(event: any): void {
    const categoryId = event?.detail?.[0];
    if (categoryId) {
      this.articleForm.patchValue({ category: categoryId });
    }
  }

  onStatusChange(event: any): void {
    const status = event?.detail?.[0];
    if (status) {
      this.articleForm.patchValue({ content_status: status });
    }
  }
}
