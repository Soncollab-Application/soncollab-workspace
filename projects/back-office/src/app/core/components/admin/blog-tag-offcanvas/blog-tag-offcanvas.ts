import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from 'shared-lib';
import { BlogTagOffcanvasService } from '../../../services/admin/blog-tag-offcanvas.service';
import { AdminContentService } from '../../../services/admin/admin-content.service';
import { BlogTag } from '../../../models/content/blog-tag.model';

@Component({
  selector: 'app-blog-tag-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './blog-tag-offcanvas.html',
  styleUrl: './blog-tag-offcanvas.css',
})
export class BlogTagOffcanvas implements OnDestroy {
  private fb = inject(FormBuilder);
  protected offcanvasService = inject(BlogTagOffcanvasService);
  private contentService = inject(AdminContentService);
  private toastService = inject(ToastService);
  protected translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  form: FormGroup;
  isSubmitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      slug: ['', [Validators.required, Validators.maxLength(50)]],
      color: ['#6b7280'],
    });

    effect(() => {
      const tag = this.offcanvasService.tag();
      const isOpen = this.offcanvasService.isOpen();

      if (isOpen) {
        if (tag && this.offcanvasService.mode() === 'edit') {
          this.form.patchValue({
            name: tag.name,
            slug: tag.slug,
            color: tag.color || '#6b7280',
          });
        } else {
          this.form.reset({
            name: '',
            slug: '',
            color: '#6b7280',
          });
        }
      } else {
        this.form.reset({
          name: '',
          slug: '',
          color: '#6b7280',
        });
        this.form.markAsUntouched();
        this.form.markAsPristine();
      }
    });

    this.form.get('name')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((name) => {
      if (this.offcanvasService.mode() === 'create' && name) {
        const slug = this.generateSlug(name);
        this.form.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formData: any = this.form.value;

    if (this.offcanvasService.mode() === 'create' && this.offcanvasService.sourceDocumentId()) {
      formData.documentId = this.offcanvasService.sourceDocumentId();
      formData.locale = this.offcanvasService.locale();
    }

    const request$ =
      this.offcanvasService.mode() === 'create'
        ? this.contentService.createBlogTag(formData)
        : this.contentService.updateBlogTag(
          this.offcanvasService.tag()!.documentId,
          formData,
          this.offcanvasService.tag()!.locale
        );

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'blog-tag-offcanvas.success.created'
              : 'blog-tag-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.close();
        window.location.reload();
      },
      error: (err) => {
        console.error('Error saving tag:', err);
        this.toastService.showError(
          this.translate.instant('blog-tag-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
