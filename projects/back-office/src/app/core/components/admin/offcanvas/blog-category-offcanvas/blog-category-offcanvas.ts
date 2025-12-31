import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {Observable, Subject, takeUntil} from 'rxjs';
import { ToastService } from 'shared-lib';
import { BlogCategoryOffcanvasService } from '../../../../services/admin/offcanvas/blog-category-offcanvas.service';
import { AdminContentService } from '../../../../services/admin/admin-content.service';
import {BlogCategory} from '../../../../models/content/blog-category.model';

@Component({
  selector: 'app-blog-category-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './blog-category-offcanvas.html',
  styleUrl: './blog-category-offcanvas.css',
})
export class BlogCategoryOffcanvas implements OnDestroy {
  private fb = inject(FormBuilder);
  protected offcanvasService = inject(BlogCategoryOffcanvasService);
  private contentService = inject(AdminContentService);
  private toastService = inject(ToastService);
  protected translate = inject(TranslateService);

  private destroy$ = new Subject<void>();

  form: FormGroup;
  isSubmitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      color: ['#448C74'],
      icon: [''],
      is_featured: [false],
    });

    // Effect pour charger les données ou réinitialiser
    effect(() => {
      const category = this.offcanvasService.category();
      const isOpen = this.offcanvasService.isOpen();

      if (isOpen) {
        if (category && this.offcanvasService.mode() === 'edit') {
          this.form.patchValue({
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            color: category.color || '#448C74',
            icon: category.icon || '',
            is_featured: category.is_featured || false,
          });
        } else {
          this.form.reset({
            name: '',
            slug: '',
            description: '',
            color: '#448C74',
            icon: '',
            is_featured: false,
          });
        }
      } else {
        // Réinitialiser quand l'offcanvas se ferme
        this.form.reset({
          name: '',
          slug: '',
          description: '',
          color: '#448C74',
          icon: '',
          is_featured: false,
        });
        this.form.markAsUntouched();
        this.form.markAsPristine();
      }
    });

    // Auto-génération du slug depuis le nom (création uniquement)
    this.form.get('name')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((name) => {
      if (this.offcanvasService.mode() === 'create' && name) {
        const slug = this.generateSlug(name);
        this.form.get('slug')?.setValue(slug, { emitEvent: false });
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formData: any = this.form.value;

    let request$: Observable<{ data: BlogCategory }>;

    if (this.offcanvasService.mode() === 'create') {
      if (this.offcanvasService.sourceDocumentId()) {
        request$ = this.contentService.updateBlogCategory(
          this.offcanvasService.sourceDocumentId()!,
          formData,
          this.offcanvasService.locale()
        );
      } else {
        formData.locale = this.offcanvasService.locale();
        request$ = this.contentService.createBlogCategory(formData);
      }
    } else {
      request$ = this.contentService.updateBlogCategory(
        this.offcanvasService.category()!.documentId,
        formData,
        this.offcanvasService.category()!.locale
      );
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'blog-category-offcanvas.success.created'
              : 'blog-category-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.triggerSuccess();
        this.offcanvasService.close();
      },
      error: (err) => {
        console.error('Error saving category:', err);
        this.toastService.showError(
          this.translate.instant('blog-category-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
