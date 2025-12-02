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
import { HelpCategoryFilters } from '../../../models/content/help-category.model';
import { HelpArticleOffcanvasService } from '../../../services/admin/help-article-offcanvas.service';
import { AdminContentService } from '../../../services/admin/admin-content.service';
import { MediaFile } from '../../../models/media/media-file.model';
import { MediaPickerModal } from '../../../../pages/media/media-library/components/media-picker-modal/media-picker-modal';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-help-article-offcanvas',
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
  templateUrl: './help-article-offcanvas.html',
  styleUrl: './help-article-offcanvas.css'
})
export class HelpArticleOffcanvas implements OnInit, OnDestroy {
  private offcanvasService = inject(HelpArticleOffcanvasService);
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

  isViewMode = computed(() => this.mode() === 'view');
  isEditMode = computed(() => this.mode() === 'edit');
  isCreateMode = computed(() => this.mode() === 'create');
  canEdit = computed(() => this.mode() !== 'view');
  editorKey = signal(0);

  articleForm!: FormGroup;
  categories = signal<any[]>([]);

  attachments = signal<MediaFile[]>([]);

  showMediaPicker = signal(false);
  currentImageField = signal<'attachments' | 'rich_text' | null>(null);
  richTextImageCallback = signal<((result: ImageResult) => void) | null>(null);

  categoryOptions = computed<ChoiceOption[]>(() =>
    this.categories().map(cat => ({
      value: cat.documentId,
      label: cat.name
    }))
  );

  canReviewArticle = computed(() =>
    this.permissionsService.hasPermission('help-article', 'help-article', 'reviewContent')
  );

  statusOptions = computed<ChoiceOption[]>(() => [
    { value: 'draft', label: this.translate.instant('help-articles.statuses.draft') },
    { value: 'pending_review', label: this.translate.instant('help-articles.statuses.pending_review') },
    { value: 'approved', label: this.translate.instant('help-articles.statuses.approved') },
  ]);

  difficultyOptions = computed<ChoiceOption[]>(() => [
    { value: 'beginner', label: this.translate.instant('help-articles.difficulty.beginner') },
    { value: 'intermediate', label: this.translate.instant('help-articles.difficulty.intermediate') },
    { value: 'advanced', label: this.translate.instant('help-articles.difficulty.advanced') },
  ]);

  categoryConfig: ChoiceConfig = {
    searchEnabled: true,
    allowHTML: false,
    itemSelectText: '',
    placeholder: true,
    placeholderValue: this.translate.instant('help-articles.offcanvas.select_category'),
  };

  statusConfig: ChoiceConfig = {
    searchEnabled: false,
    allowHTML: false,
    itemSelectText: '',
    shouldSort: false,
    removeItemButton: false
  };

  difficultyConfig: ChoiceConfig = {
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
      title: ['', [Validators.required, Validators.maxLength(255)]],
      excerpt: ['', [Validators.maxLength(300)]],
      content: ['', [Validators.required]],
      category: [null, [Validators.required]],
      difficulty_level: ['beginner', [Validators.required]],
      estimated_reading_time: [0],
      is_featured: [false],
      order: [0],
      seo_title: ['', [Validators.maxLength(250)]],
      seo_description: ['', [Validators.maxLength(250)]],
      search_keywords: [''],
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
          this.articleForm.patchValue({ estimated_reading_time: readingTime }, { emitEvent: false });
        }
      });
  }

  private loadOffcanvasData(data: any): void {
    this.mode.set(data.mode);
    this.locale.set(data.locale);
    this.articleId.set(data.articleId);
    this.activeTab.set('content');
    this.showPreview.set(data.mode === 'view');

    this.attachments.set([]);

    this.loadCategories();

    if ((data.mode === 'edit' || data.mode === 'view') && data.articleId) {
      this.editorKey.update(v => v + 1);
      this.loadArticle(data.articleId);
    } else {
      this.articleForm.enable();
      this.articleForm.reset({
        is_featured: false,
        content_status: 'draft',
        difficulty_level: 'beginner',
        estimated_reading_time: 0,
        order: 0
      });

      this.editorKey.update(v => v + 1);
    }
  }

  private loadCategories(): void {
    const filters: HelpCategoryFilters = {
      locale: this.locale()
    };

    this.contentService.getHelpCategories(1, 100, filters)
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

    this.contentService.getHelpArticleById(documentId, this.locale())
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
            difficulty_level: article.difficulty_level,
            is_featured: article.is_featured,
            estimated_reading_time: article.estimated_reading_time,
            order: article.order,
            seo_title: article.seo_title,
            seo_description: article.seo_description,
            search_keywords: article.search_keywords,
            canonical_url: article.canonical_url,
            content_status: article.content_status,
            review_notes: article.review_notes || ''
          });

          if (this.mode() === 'view') {
            this.articleForm.disable();
          } else {
            this.articleForm.enable();
          }

          if (article.attachments && article.attachments.length > 0) {
            this.attachments.set(article.attachments as any);
          }

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.showError(this.translate.instant('help-articles.messages.error_loading'));
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
      difficulty_level: 'beginner',
      estimated_reading_time: 0,
      order: 0
    });
    this.attachments.set([]);
    this.showPreview.set(false);
    this.activeTab.set('content');
  }


  openMediaPickerForAttachments(): void {
    this.currentImageField.set('attachments');
    this.showMediaPicker.set(true);
  }

  onMediaPickerFileSelected(file: MediaFile): void {
    const field = this.currentImageField();

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

    if (field === 'attachments') {
      const current = this.attachments();
      if (!current.find(a => a.id === file.id)) {
        this.attachments.set([...current, file]);
      }
    }

    this.showMediaPicker.set(false);
    this.currentImageField.set(null);
  }

  onMediaPickerClosed(): void {
    this.showMediaPicker.set(false);
    this.currentImageField.set(null);
    this.richTextImageCallback.set(null);
  }

  removeAttachment(fileId: number): void {
    this.attachments.update(files => files.filter(f => f.id !== fileId));
  }

  onRichTextImageInsert(callback: (result: ImageResult) => void): void {
    this.richTextImageCallback.set(callback);
    this.currentImageField.set('rich_text');
    this.showMediaPicker.set(true);
  }

  async save(): Promise<void> {
    if (this.articleForm.invalid || this.saving()) return;

    this.saving.set(true);

    const formValue = this.articleForm.getRawValue();
    const markdownContent = this.htmlToMarkdown(formValue.content);

    const payload: any = {
      title: formValue.title,
      excerpt: formValue.excerpt,
      content: markdownContent,
      category: formValue.category ? { documentId: formValue.category } : null,
      difficulty_level: formValue.difficulty_level,
      is_featured: formValue.is_featured,
      estimated_reading_time: formValue.estimated_reading_time,
      order: formValue.order,
      seo_title: formValue.seo_title,
      seo_description: formValue.seo_description,
      search_keywords: formValue.search_keywords,
      canonical_url: formValue.canonical_url,
      content_status: formValue.content_status,
      review_notes: formValue.review_notes,
      locale: this.locale()
    };

    // Toujours envoyer le tableau des attachments (même vide)
    payload.attachments = this.attachments().map(a => a.id);

    const request = this.mode() === 'create'
      ? this.contentService.createHelpArticle(payload)
      : this.contentService.updateHelpArticle(this.articleId()!, payload);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.toast.showSuccess(
            this.translate.instant(
              this.mode() === 'create'
                ? 'help-articles.messages.created_success'
                : 'help-articles.messages.updated_success'
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
          this.toast.showError(this.translate.instant('help-articles.messages.save_error'));
        }
      });
  }

  getFileIcon(mime?: string): string {
    if (!mime) return 'insert_drive_file';

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video_file';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('excel') || mime.includes('spreadsheet')) return 'table_chart';
    if (mime.includes('zip') || mime.includes('compressed')) return 'folder_zip';

    return 'insert_drive_file';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  protected readonly environment = environment;
}
