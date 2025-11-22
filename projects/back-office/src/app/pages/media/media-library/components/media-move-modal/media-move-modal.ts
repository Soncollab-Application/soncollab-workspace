import {Component, computed, effect, inject, input, output, signal, viewChild} from '@angular/core';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subject, takeUntil} from 'rxjs';
import {MediaService} from '../../../../../core/services/media/media.service';
import {Choice, ChoiceOption, ToastService} from 'shared-lib';
import {FolderTreeNode, MediaFile, MediaFolder} from '../../../../../core/models/media/media-file.model';

@Component({
  selector: 'app-media-move-modal',
  imports: [
    TranslatePipe,
    Choice
  ],
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

  choiceRef = viewChild<Choice>(Choice);

  hasDestinations = computed(() => {
    const structure = this.folderStructure();
    return structure.length > 0;
  });

  destinationOptions = computed<ChoiceOption[]>(() => {
    const structure = this.folderStructure();
    const options: ChoiceOption[] = [];
    const selectedValue = this.selectedDestination();

    const buildOptions = (nodes: FolderTreeNode[], level = 0): void => {
      for (const node of nodes) {
        // Indentation visuelle avec des espaces insécables
        const indent = level > 0 ? '\u00A0\u00A0'.repeat(level) + '└─ ' : '';

        options.push({
          value: node.value ?? '',
          label: indent + node.label,
          selected: (node.value ?? '') === (selectedValue ?? '')
        });

        if (node.children && node.children.length > 0) {
          buildOptions(node.children, level + 1);
        }
      }
    };

    buildOptions(structure);
    return options;
  });

  constructor() {
    // Sync la valeur sélectionnée avec le Choice component
    effect(() => {
      const destination = this.selectedDestination();
      const choice = this.choiceRef();
      if (choice && this.show() && this.hasDestinations()) {
        // Petit délai pour que le Choice soit initialisé
        setTimeout(() => {
          choice.writeValue(destination ?? '');
        }, 100);
      }
    });
  }

  onDestinationChange(value: string): void {
    this.destinationChange.emit(value || null);
  }

  move(): void {
    const destination = this.selectedDestination();
    const items = this.itemsToMove();

    if (items.length === 0) {
      this.toastService.showWarning(this.translate.instant('mediaLibrary.warnings.nothingToMove'));
      return;
    }

    this.isMoving.set(true);

    const fileIds = items
      .filter(item => item.type === 'asset')
      .map(item => item.documentId);

    const folderIds = items
      .filter(item => item.type === 'folder')
      .map(item => item.documentId);

    this.mediaService.bulkMove({
      fileIds,
      folderIds,
      destinationFolderId: destination || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.showSuccess(
            this.translate.instant('mediaLibrary.success.itemsMoved', { count: items.length })
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
