import { Component, computed, inject, OnDestroy, OnInit, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  Choice,
  ChoiceOption,
  ChoiceConfig,
  ToastService,
  Offcanvas,
  RichTextEditor,
  ImageResult,
  PermissionService
} from 'shared-lib';
import { Subject, takeUntil } from 'rxjs';
import { MarkdownModule } from 'ngx-markdown';
import { BlogCategoryFilters } from '../../../models/content/blog-category.model';
import { BlogArticleOffcanvasService } from '../../../services/admin/blog-article-offcanvas.service';
import { AdminContentService } from '../../../services/admin/admin-content.service';
import { MediaFile } from '../../../models/media/media-file.model';
import { MediaPickerModal } from '../../../../pages/media/media-library/components/media-picker-modal/media-picker-modal';
import { marked } from 'marked';
import TurndownService from 'turndown';
import {environment} from '../../../../../environments/environment';

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
    Offcanvas,
    RichTextEditor,
    MediaPickerModal
  ],
  templateUrl: './blog-article-offcanvas.html',
  styleUrl: './blog-article-offcanvas.css'
})
export class BlogArticleOffcanvas implements OnInit, OnDestroy {
  private offcanvasService = inject(BlogArticleOffcanvasService);
  private contentService = inject(AdminContentService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();
  private permissionsService = inject(PermissionService);

  private turndownService = new TurndownService();

  isOpen = computed(() => this.offcanvasService.getState().isOpen);
  mode = signal<'create' | 'edit' | 'view'>('create');
  locale = signal('fr');
  articleId = signal<string | undefined>(undefined);
  loading = signal(false);
  saving = signal(false);

  activeTab = signal<'content' | 'seo'>('content');
  showPreview = signal(false);
  editorKey = signal(0);

  isViewMode = computed(() => this.mode() === 'view');
  isEditMode = computed(() => this.mode() === 'edit');
  isCreateMode = computed(() => this.mode() === 'create');
  canEdit = computed(() => this.mode() !== 'view');


  articleForm!: FormGroup;
  categories = signal<any[]>([]);

  featuredImage = signal<MediaFile | null>(null);
  ogImage = signal<MediaFile | null>(null);

  showMediaPicker = signal(false);
  currentImageField = signal<'featured_image' | 'og_image' | 'rich_text' | null>(null);
  richTextImageCallback = signal<((result: ImageResult) => void) | null>(null);

  categoryOptions = computed<ChoiceOption[]>(() =>
    this.categories().map(cat => ({
      value: cat.documentId,
      label: cat.name
    }))
  );

  canReviewArticle = computed(() =>
    this.permissionsService.hasPermission('blog-article', 'blog-article', 'reviewContent')
  );

  statusOptions = computed<ChoiceOption[]>(() => [
    { value: 'draft', label: this.translate.instant('blog-articles.statuses.draft') },
    { value: 'pending_review', label: this.translate.instant('blog-articles.statuses.pending_review') },
    { value: 'approved', label: this.translate.instant('blog-articles.statuses.approved') },
  ]);

  categoryConfig: ChoiceConfig = {
    searchEnabled: true,
    allowHTML: false,
    itemSelectText: '',
    placeholder: true,
    placeholderValue: this.translate.instant('blog-articles.offcanvas.select_category'),
  };

  statusConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false
  };

  constructor() {
    effect(() => {
      const state = this.offcanvasService.getState();
      if (state.isOpen && state.data) {
        untracked(() => {
          this.loadOffcanvasData(state.data!);
        });
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private async markdownToHtml(markdown: string): Promise<string> {
    if (!markdown) return '';

    try {
      const html = await marked.parse(markdown, {
        breaks: true,
        gfm: true
      });
      return html;
    } catch (error) {
      console.error('Error converting markdown to HTML:', error);
      return markdown;
    }
  }

  private htmlToMarkdown(html: string): string {
    if (!html) return '';

    try {
      return this.turndownService.turndown(html);
    } catch (error) {
      console.error('Error converting HTML to markdown:', error);
      return html;
    }
  }

  private initForm(): void {
    this.articleForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      excerpt: ['', [Validators.maxLength(300)]],
      content: ['', [Validators.required]],
      category: [null, [Validators.required]],
      is_featured: [false],
      reading_time: [0],
      seo_title: ['', [Validators.maxLength(60)]],
      seo_description: ['', [Validators.maxLength(160)]],
      seo_keywords: [''],
      canonical_url: [''],
      content_status: ['draft'],
      review_notes: ['']
    });

    this.articleForm.get('content')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => {
        if (content) {
          const markdown = this.htmlToMarkdown(content);
          const words = markdown.split(/\s+/).length;
          const readingTime = Math.ceil(words / 200);
          this.articleForm.patchValue({ reading_time: readingTime }, { emitEvent: false });
        }
      });
  }

  private loadOffcanvasData(data: any): void {
    this.mode.set(data.mode);
    this.locale.set(data.locale);
    this.articleId.set(data.articleId);
    this.activeTab.set('content');
    this.showPreview.set(data.mode === 'view');

    this.featuredImage.set(null);
    this.ogImage.set(null);

    this.loadCategories();

    if ((data.mode === 'edit' || data.mode === 'view') && data.articleId) {
      this.editorKey.update(v => v + 1);
      this.loadArticle(data.articleId);
    } else {
      this.articleForm.enable();
      this.articleForm.reset({
        is_featured: false,
        content_status: 'draft',
        reading_time: 0
      });

      this.editorKey.update(v => v + 1);
    }
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

  private async loadArticle(documentId: string): Promise<void> {
    this.loading.set(true);

    this.contentService.getBlogArticleById(documentId, this.locale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response) => {
          const article = response.data;

          const htmlContent = await this.markdownToHtml(article.content || '');

          this.articleForm.patchValue({
            title: article.title,
            excerpt: article.excerpt,
            content: htmlContent,
            category: article.category?.documentId,
            is_featured: article.is_featured,
            reading_time: article.reading_time,
            seo_title: article.seo_title,
            seo_description: article.seo_description,
            seo_keywords: article.seo_keywords,
            canonical_url: article.canonical_url,
            content_status: article.content_status,
            review_notes: article.review_notes || ''
          });

          // Gérer l'état du formulaire selon le mode
          if (this.mode() === 'view') {
            this.articleForm.disable();
          } else {
            this.articleForm.enable();
          }

          if (article.featured_image) {
            this.featuredImage.set(article.featured_image as any);
          }

          if (article.og_image) {
            this.ogImage.set(article.og_image as any);
          }

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.showError(this.translate.instant('blog-articles.messages.error_loading'));
          this.close();
        }
      });
  }

  setActiveTab(tab: 'content' | 'seo'): void {
    this.activeTab.set(tab);
  }

  togglePreview(): void {
    this.showPreview.update(val => !val);
  }

  close(): void {
    this.offcanvasService.close();
    this.articleForm.enable();
    this.articleForm.reset({
      is_featured: false,
      content_status: 'draft',
      reading_time: 0
    });
    this.featuredImage.set(null);
    this.ogImage.set(null);
  }

  openMediaPickerForImage(field: 'featured_image' | 'og_image'): void {
    this.currentImageField.set(field);
    this.showMediaPicker.set(true);
  }

  onMediaPickerFileSelected(file: MediaFile): void {
    const field = this.currentImageField();

    // Cas du rich text editor
    if (field === 'rich_text') {
      const callback = this.richTextImageCallback();
      if (callback) {
        callback({
          url: environment.api.baseUrl + file.url,
          alt: file.alternativeText || file.name
        });
      }
      this.showMediaPicker.set(false);
      this.currentImageField.set(null);
      this.richTextImageCallback.set(null);
      return;
    }

    if (!field || (field !== 'featured_image' && field !== 'og_image')) return;

    // Stocker l'image sélectionnée (pour CREATE et EDIT)
    if (field === 'featured_image') {
      this.featuredImage.set(file);
    } else {
      this.ogImage.set(file);
    }

    this.showMediaPicker.set(false);
    this.currentImageField.set(null);

    // En mode EDIT, faire la liaison immédiatement
    if (this.mode() === 'edit' && this.articleId()) {
      this.linkImageToArticle(field, file);
    }
  }

  private linkImageToArticle(field: 'featured_image' | 'og_image', file: MediaFile): void {
    const articleId = this.articleId();
    if (!articleId) return;

    this.saving.set(true);

    // Mettre à jour l'article avec l'ID de l'image
    const payload: any = {};
    payload[field] = file.id;

    this.contentService.updateBlogArticle(articleId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.showSuccess(
            this.translate.instant('blog-articles.messages.image_uploaded')
          );
        },
        error: () => {
          this.saving.set(false);
          this.toast.showError(
            this.translate.instant('blog-articles.messages.image_upload_error')
          );
          // Rollback en cas d'erreur
          if (field === 'featured_image') {
            this.featuredImage.set(null);
          } else {
            this.ogImage.set(null);
          }
        }
      });
  }

  onMediaPickerClose(): void {
    this.showMediaPicker.set(false);
    this.currentImageField.set(null);
    this.richTextImageCallback.set(null);
  }

  removeImage(field: 'featured_image' | 'og_image'): void {
    const image = field === 'featured_image' ? this.featuredImage() : this.ogImage();

    if (!image) return;

    // En mode EDIT, supprimer la liaison immédiatement
    if (this.mode() === 'edit' && this.articleId()) {
      this.unlinkImageFromArticle(field);
    } else {
      if (field === 'featured_image') {
        this.featuredImage.set(null);
      } else {
        this.ogImage.set(null);
      }
    }
  }

  private unlinkImageFromArticle(field: 'featured_image' | 'og_image'): void {
    const articleId = this.articleId();
    if (!articleId) return;

    this.saving.set(true);

    // Mettre à jour l'article en retirant l'image
    const payload: any = {};
    payload[field] = null;

    this.contentService.updateBlogArticle(articleId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (field === 'featured_image') {
            this.featuredImage.set(null);
          } else {
            this.ogImage.set(null);
          }
          this.toast.showSuccess(
            this.translate.instant('blog-articles.messages.image_removed')
          );
        },
        error: () => {
          this.saving.set(false);
          this.toast.showError(
            this.translate.instant('blog-articles.messages.image_remove_error')
          );
        }
      });
  }



  onImageSelectRequestedForRichText(callback: (result: ImageResult) => void): void {
    this.richTextImageCallback.set(callback);
    this.currentImageField.set('rich_text');
    this.showMediaPicker.set(true);
  }

  onSubmit(): void {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      this.toast.showWarning(this.translate.instant('blog-articles.messages.fill_required'));
      return;
    }

    this.saving.set(true);
    const formValue = this.articleForm.value;
    const state = this.offcanvasService.getState();

    const htmlContent = formValue.content;
    const markdownContent = this.htmlToMarkdown(htmlContent);

    const payload: any = {
      title: formValue.title,
      excerpt: formValue.excerpt,
      content: markdownContent,
      category: formValue.category,
      is_featured: formValue.is_featured,
      reading_time: formValue.reading_time,
      content_status: formValue.content_status,
      seo_title: formValue.seo_title,
      seo_description: formValue.seo_description,
      seo_keywords: formValue.seo_keywords,
      canonical_url: formValue.canonical_url,
      locale: this.locale()
    };

    if (state.data?.sourceDocumentId) {
      payload.documentId = state.data.sourceDocumentId;
    }

    if (this.canReviewArticle()) {
      payload.review_notes = formValue.review_notes;
    }

    if (this.mode() === 'create') {
      if (this.featuredImage()) {
        payload.featured_image = this.featuredImage()!.id;
      }

      if (this.ogImage()) {
        payload.og_image = this.ogImage()!.id;
      }
    }

    const request = this.mode() === 'create'
      ? this.contentService.createBlogArticle(payload)
      : this.contentService.updateBlogArticle(this.articleId()!, payload);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.toast.showSuccess(
            this.translate.instant(
              this.mode() === 'create'
                ? 'blog-articles.messages.created_success'
                : 'blog-articles.messages.updated_success'
            )
          );

          const state = this.offcanvasService.getState();
          if (state.onSuccess) {
            state.onSuccess(response.data.documentId);
          }

          this.close();
        },
        error: () => {
          this.saving.set(false);
          this.toast.showError(this.translate.instant('blog-articles.messages.save_error'));
        }
      });
  }

  protected readonly environment = environment;
}
