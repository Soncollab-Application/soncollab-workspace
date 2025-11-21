import {Component, computed, input, output} from '@angular/core';
import {MediaFile} from '../../../../../core/models/media/media-file.model';
import {environment} from '../../../../../../environments/environment';
import {TranslatePipe} from '@ngx-translate/core';


@Component({
  selector: 'app-media-asset-item',
  imports: [
    TranslatePipe
  ],
  templateUrl: './media-asset-item.html',
  styleUrl: './media-asset-item.css',
})
export class MediaAssetItem {
  asset = input.required<MediaFile>();
  isSelected = input.required<boolean>();

  assetClick = output<void>();
  toggleSelection = output<void>();
  editClick = output<void>();
  moveClick = output<void>();
  deleteClick = output<void>();
  downloadClick = output<void>();
  copyLinkClick = output<void>();

  isImage = computed(() => this.asset().mime.startsWith('image/'));
  isAudio = computed(() => this.asset().mime.startsWith('audio/'));
  isVideo = computed(() => this.asset().mime.startsWith('video/'));
  isPDF = computed(() => this.asset().mime.includes('pdf'));

  thumbnailUrl = computed(() => {
    const url = this.asset().formats?.thumbnail?.url || this.asset().url;
    return url.startsWith('http') ? url : environment.api.baseUrl + url;
  });

  fullUrl = computed(() => {
    const url = this.asset().url;
    return url.startsWith('http') ? url : environment.api.baseUrl + url;
  });

  getFileIcon(): string {
    const mime = this.asset().mime;
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    return 'insert_drive_file';
  }

  getTypeBadge(): string {
    const mime = this.asset().mime;
    if (mime.startsWith('image/')) return 'IMG';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('document')) return 'DOC';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLS';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT';
    return 'FILE';
  }
}
