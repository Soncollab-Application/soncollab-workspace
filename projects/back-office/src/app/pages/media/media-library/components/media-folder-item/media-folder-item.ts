import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-media-folder-item',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './media-folder-item.html',
  styleUrl: './media-folder-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaFolderItem {
  folder = input.required<MediaFolder>();
  isSelected = input.required<boolean>();
  currentUserDocumentId = input<string | null>(null);

  folderClick = output<void>();
  toggleSelection = output<void>();
  editClick = output<void>();
  moveClick = output<void>();
  deleteClick = output<void>();

  canSelect = computed(() => {
    const folder = this.folder();
    const userId = this.currentUserDocumentId();

    // Si le dossier appartient à l'utilisateur connecté
    if (userId && folder.ownerDocumentId === userId) {
      return true;
    }

    // Si hierarchy existe, on est dans users (et pas le propriétaire)
    if (folder.hierarchy && folder.hierarchy.length > 0) {
      return false;
    }

    if (folder.name === 'users') return false;

    return true;
  });

  getFolderStats(): string {
    const folder = this.folder();
    const foldersCount = folder.children?.length || 0;
    const assetsCount = folder.files?.count || 0;
    const parts: string[] = [];

    if (foldersCount > 0) {
      parts.push(`${foldersCount} folder${foldersCount > 1 ? 's' : ''}`);
    } else {
      parts.push('0 folder');
    }

    if (assetsCount > 0) {
      parts.push(`${assetsCount} asset${assetsCount > 1 ? 's' : ''}`);
    } else {
      parts.push('0 asset');
    }

    return parts.join(', ');
  }
}
