import {Component, effect, inject, input, output, signal} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {ToastService} from 'shared-lib';
import {MediaFile, MediaFolder} from '../../../../../core/models/media/media-file.model';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-media-edit-modal',
  imports: [
    TranslatePipe,
    FormsModule
  ],
  templateUrl: './media-edit-modal.html',
  styleUrl: './media-edit-modal.css',
})
export class MediaEditModal {
  private destroy$ = new Subject<void>();
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  file = input<MediaFile | null>(null);
  folder = input<MediaFolder | null>(null);

  close = output<void>();
  editComplete = output<void>();

  editName = signal('');
  editAlternativeText = signal('');
  editCaption = signal('');
  isSaving = signal(false);

  isFile = () => this.file() !== null;
  isFolder = () => this.folder() !== null;

  constructor() {
    // Effect pour initialiser les champs quand file/folder change
    effect(() => {
      const file = this.file();
      const folder = this.folder();

      if (file) {
        this.editName.set(file.name);
        this.editAlternativeText.set(file.alternativeText || '');
        this.editCaption.set(file.caption || '');
      } else if (folder) {
        this.editName.set(folder.name);
        this.editAlternativeText.set('');
        this.editCaption.set('');
      }
    });
  }

  save(): void {
    const name = this.editName().trim();
    if (!name) return;

    this.isSaving.set(true);

    if (this.isFile()) {
      const file = this.file()!;
      const data = {
        name,
        alternativeText: this.editAlternativeText(),
        caption: this.editCaption()
      };

      this.mediaService.updateFile(file.documentId, data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess(
              this.translate.instant('mediaLibrary.success.fileUpdated')
            );
            this.isSaving.set(false);
            this.editComplete.emit();
            this.close.emit();
          },
          error: (error) => {
            this.toastService.showError(
              this.translate.instant('mediaLibrary.errors.updateFileFailed', { message: error.message })
            );
            this.isSaving.set(false);
          }
        });
    } else if (this.isFolder()) {
      const folder = this.folder()!;

      this.mediaService.updateFolder(folder.documentId, { name })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess(
              this.translate.instant('mediaLibrary.success.folderUpdated', { name })
            );
            this.isSaving.set(false);
            this.editComplete.emit();
            this.close.emit();
          },
          error: (error) => {
            this.toastService.showError(
              this.translate.instant('mediaLibrary.errors.updateFolderFailed', { message: error.message })
            );
            this.isSaving.set(false);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
