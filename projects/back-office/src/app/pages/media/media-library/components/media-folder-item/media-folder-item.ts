import {Component, computed, inject, input, output} from '@angular/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {DropdownSingleDirective} from 'shared-lib';

@Component({
  selector: 'app-media-folder-item',
  standalone: true,
  imports: [TranslatePipe, DropdownSingleDirective],
  templateUrl: './media-folder-item.html',
  styleUrl: './media-folder-item.css',
})
export class MediaFolderItem {
  private translate = inject(TranslateService);

  folder = input.required<MediaFolder>();
  isSelected = input.required<boolean>();
  currentUserDocumentId = input<string | null>(null);

  showCheckbox = input<boolean>(true);
  showMenu = input<boolean>(true);
  showEditAction = input<boolean>(true);
  showMoveAction = input<boolean>(true);
  showDeleteAction = input<boolean>(true);
  showStats = input<boolean>(true);
  clickable = input<boolean>(true);

  folderClick = output<void>();
  toggleSelection = output<void>();
  editClick = output<void>();
  moveClick = output<void>();
  deleteClick = output<void>();

  canSelect = computed(() => {
    const folder = this.folder();
    const userId = this.currentUserDocumentId();

    if (userId && folder.ownerDocumentId === userId) {
      return true;
    }

    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    if (folder.name === 'users') {
      return false;
    }

    return true;
  });

  hasMenuActions = computed(() =>
    this.showEditAction() || this.showMoveAction() || this.showDeleteAction()
  );

  getFolderStats(): string {
    const folder = this.folder();
    const foldersCount = folder.children?.length || 0;
    const assetsCount = folder.files?.count || 0;
    const parts: string[] = [];

    // Folders
    if (foldersCount === 0) {
      parts.push(this.translate.instant('mediaLibrary.stats.noFolder'));
    } else if (foldersCount === 1) {
      parts.push(this.translate.instant('mediaLibrary.stats.oneFolder'));
    } else {
      parts.push(this.translate.instant('mediaLibrary.stats.multipleFolders', { count: foldersCount }));
    }

    // Assets
    if (assetsCount === 0) {
      parts.push(this.translate.instant('mediaLibrary.stats.noAsset'));
    } else if (assetsCount === 1) {
      parts.push(this.translate.instant('mediaLibrary.stats.oneAsset'));
    } else {
      parts.push(this.translate.instant('mediaLibrary.stats.multipleAssets', { count: assetsCount }));
    }

    return parts.join(', ');
  }

  handleFolderClick(): void {
    if (this.clickable()) {
      this.folderClick.emit();
    }
  }
}
