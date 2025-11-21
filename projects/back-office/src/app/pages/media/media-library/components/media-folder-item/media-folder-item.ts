import {Component, input, output} from '@angular/core';
import {MediaFolder} from '../../../../../core/models/media/media-file.model';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-media-folder-item',
  imports: [
    TranslatePipe
  ],
  templateUrl: './media-folder-item.html',
  styleUrl: './media-folder-item.css',
})
export class MediaFolderItem {
  folder = input.required<MediaFolder>();
  isSelected = input.required<boolean>();

  folderClick = output<void>();
  toggleSelection = output<void>();
  editClick = output<void>();
  moveClick = output<void>();
  deleteClick = output<void>();
}
