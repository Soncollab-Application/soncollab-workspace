import {Component, inject, input, output, signal} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {ToastService} from 'shared-lib';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FolderTreeNode, MediaFile, MediaFolder} from '../../../../../core/models/media/media-file.model';

@Component({
  selector: 'app-media-move-modal',
  imports: [TranslatePipe],
  templateUrl: './media-move-modal.html',
  styleUrl: './media-move-modal.css',
})
export class MediaMoveModal {
  private destroy$ = new Subject<void>();
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private translate = inject(TranslateService);

  show = input.required<boolean>();
  folderStructure = input.required<FolderTreeNode[]>();
  itemsToMove = input.required<Array<MediaFile | MediaFolder>>();
  selectedDestination = input.required<string | null>();

  close = output<void>();
  moveComplete = output<void>();
  destinationChange = output<string | null>();

  isMoving = signal(false);

  onDestinationChange(value: string): void {
    const destination = value === 'null' ? null : value;
    this.destinationChange.emit(destination);
  }

  move(): void {
    const items = this.itemsToMove();
    const destinationFolderId = this.selectedDestination();

    if (items.length === 0) {
      this.toastService.showWarning(
        this.translate.instant('mediaLibrary.warnings.nothingToMove')
      );
      return;
    }

    const fileIds = items
      .filter(item => item.type === 'asset')
      .map(item => item.documentId);

    const folderIds = items
      .filter(item => item.type === 'folder')
      .map(item => item.documentId);

    this.isMoving.set(true);

    const moveRequest: any = {
      fileIds,
      folderIds
    };

    if (destinationFolderId !== null) {
      moveRequest.destinationFolderId = destinationFolderId;
    }

    this.mediaService.bulkMove(moveRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const successCount = response.data.success.length;
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.itemsMoved', { count: successCount })
          );
          this.isMoving.set(false);
          this.moveComplete.emit();
          this.close.emit();
        },
        error: (error) => {
          this.toastService.showError(
            this.translate.instant('mediaLibrary.errors.moveFailed', { message: error.message })
          );
          this.isMoving.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
