import {Component, input, output, computed} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';

@Component({
  selector: 'app-media-folder-item',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './media-folder-item.html',
  styleUrl: './media-folder-item.css'
})
export class MediaFolderItem {
  folder = input.required<MediaFolder>();
  isSelected = input.required<boolean>();

  folderClick = output<void>();
  toggleSelection = output<void>();
  editClick = output<void>();
  moveClick = output<void>();
  deleteClick = output<void>();

  canSelect = computed(() => {
    const folder = this.folder();

    // Ne pas permettre la sélection du dossier users
    if (folder.name === 'users') return false;

    // Vérifier si on est dans le dossier users
    let current: MediaFolder | null | undefined = folder.parent;
    while (current) {
      if (current.name === 'users') return false;
      current = current.parent;
    }

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
