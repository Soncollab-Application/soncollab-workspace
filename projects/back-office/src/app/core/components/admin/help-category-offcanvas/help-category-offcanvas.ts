import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from 'shared-lib';
import { HelpCategoryOffcanvasService } from '../../../services/admin/help-category-offcanvas.service';
import { AdminContentService } from '../../../services/admin/admin-content.service';

@Component({
  selector: 'app-help-category-offcanvas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './help-category-offcanvas.html',
  styleUrl: './help-category-offcanvas.css',
})
export class HelpCategoryOffcanvas implements OnDestroy {
  private fb = inject(FormBuilder);
  protected offcanvasService = inject(HelpCategoryOffcanvasService);
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
      icon: ['']
    });

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
          });
        } else {
          this.form.reset({
            name: '',
            slug: '',
            description: '',
            color: '#448C74',
            icon: ''
          });
        }
      } else {
        this.form.reset({
          name: '',
          slug: '',
          description: '',
          color: '#448C74',
          icon: ''
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
    const formData = this.form.value;

    const request$ =
      this.offcanvasService.mode() === 'create'
        ? this.contentService.createHelpCategory(formData)
        : this.contentService.updateHelpCategory(
          this.offcanvasService.category()!.documentId,
          formData
        );

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess(
          this.translate.instant(
            this.offcanvasService.mode() === 'create'
              ? 'help-category-offcanvas.success.created'
              : 'help-category-offcanvas.success.updated'
          )
        );
        this.isSubmitting.set(false);
        this.offcanvasService.close();
        window.location.reload();
      },
      error: (err) => {
        console.error('Error saving category:', err);
        this.toastService.showError(
          this.translate.instant('help-category-offcanvas.error.save')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  onCancel(): void {
    this.offcanvasService.close();
  }
}
