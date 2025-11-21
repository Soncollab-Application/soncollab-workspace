import {Component, inject, input, output, signal} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {ToastService} from 'shared-lib';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-media-create-folder-modal',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './media-create-folder-modal.html',
  styleUrl: './media-create-folder-modal.css',
})
export class MediaCreateFolderModal {
  private destroy$ = new Subject<void>();
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  currentFolder = input<MediaFolder | null>(null);

  close = output<void>();
  folderCreated = output<void>();

  folderName = signal('');
  isCreating = signal(false);

  createFolder(): void {
    const name = this.folderName().trim();
    if (!name) return;

    this.isCreating.set(true);

    const parentId = this.currentFolder()?.documentId;

    this.mediaService.createFolder({ name, parentId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.folderCreated', { name })
          );
          this.folderName.set('');
          this.isCreating.set(false);
          this.folderCreated.emit();
          this.close.emit();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.createFolderFailed', { message: error.message })
          );
          this.isCreating.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
