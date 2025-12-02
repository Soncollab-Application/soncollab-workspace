import { Component, signal } from '@angular/core';
import { ImageResult, MediaResult, RichTextEditor } from 'shared-lib';
import { FormsModule } from '@angular/forms';
import { MediaPickerModal } from '../../media/media-library/components/media-picker-modal/media-picker-modal';
import { MediaFile } from '../../../core/models/media/media-file.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RichTextEditor,
    FormsModule,
    MediaPickerModal
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  content = '';
  showMediaPicker = signal(false);
  mediaPickerTypes = signal<string[]>(['image']);

  private imageCallback?: (result: ImageResult | null) => void;
  private mediaCallback?: (result: MediaResult | null) => void;

  onImageSelectRequested(callback: (result: ImageResult | null) => void): void {
    this.imageCallback = callback;
    this.mediaPickerTypes.set(['image']);
    this.showMediaPicker.set(true);
  }

  onMediaSelectRequested(callback: (result: MediaResult | null) => void): void {
    this.mediaCallback = callback;
    this.mediaPickerTypes.set(['video', 'audio', 'document', 'archive']);
    this.showMediaPicker.set(true);
  }

  onFileSelected(file: MediaFile): void {
    const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;

    if (this.imageCallback) {
      this.imageCallback({
        url: url,
        alt: file.alternativeText || file.name,
        width: file.width ?? undefined,
        height: file.height ?? undefined
      });
      this.imageCallback = undefined;
    } else if (this.mediaCallback) {
      let type: MediaResult['type'] = 'other';
      if (file.mime.startsWith('image/')) type = 'image';
      else if (file.mime.startsWith('video/')) type = 'video';
      else if (file.mime.startsWith('audio/')) type = 'audio';
      else if (file.mime.includes('pdf') || file.mime.includes('document')) type = 'document';
      else if (file.mime.includes('zip') || file.mime.includes('rar')) type = 'archive';

      this.mediaCallback({
        url: url,
        name: file.name,
        type: type,
        mime: file.mime,
        size: file.size,
        alt: file.alternativeText || file.name,
        width: file.width ?? undefined,
        height: file.height ?? undefined
      });
      this.mediaCallback = undefined;
    }

    this.showMediaPicker.set(false);
  }

  onFilesSelected(files: MediaFile[]): void {
    files.forEach(file => {
      const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;

      if (this.imageCallback) {
        this.imageCallback({
          url: url,
          alt: file.alternativeText || file.name,
          width: file.width ?? undefined,
          height: file.height ?? undefined
        });
      } else if (this.mediaCallback) {
        let type: MediaResult['type'] = 'other';
        if (file.mime.startsWith('image/')) type = 'image';
        else if (file.mime.startsWith('video/')) type = 'video';
        else if (file.mime.startsWith('audio/')) type = 'audio';
        else if (file.mime.includes('pdf') || file.mime.includes('document')) type = 'document';
        else if (file.mime.includes('zip') || file.mime.includes('rar')) type = 'archive';

        this.mediaCallback({
          url: url,
          name: file.name,
          type: type,
          mime: file.mime,
          size: file.size,
          alt: file.alternativeText || file.name,
          width: file.width ?? undefined,
          height: file.height ?? undefined
        });
      }
    });

    this.imageCallback = undefined;
    this.mediaCallback = undefined;
    this.showMediaPicker.set(false);
  }


  onMediaPickerClose(): void {
    this.showMediaPicker.set(false);

    if (this.imageCallback) {
      this.imageCallback(null);
      this.imageCallback = undefined;
    }

    if (this.mediaCallback) {
      this.mediaCallback(null);
      this.mediaCallback = undefined;
    }
  }
}
