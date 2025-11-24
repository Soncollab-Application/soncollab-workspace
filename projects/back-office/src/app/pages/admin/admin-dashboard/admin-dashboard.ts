import {Component, OnInit, signal} from '@angular/core';
import {ImageResult, RichTextEditor} from 'shared-lib';
import {FormsModule} from '@angular/forms';
import {MediaPickerModal} from '../../media/media-library/components/media-picker-modal/media-picker-modal';
import {MediaFile} from '../../../core/models/media/media-file.model';
import {environment} from '../../../../environments/environment';

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
  private imageCallback?: (result: ImageResult | null) => void;

  onImageSelectRequested(callback: (result: ImageResult | null) => void): void {
    this.imageCallback = callback;
    this.showMediaPicker.set(true);
  }

  onFileSelected(file: MediaFile): void {
    if (this.imageCallback) {
      const url = file.url.startsWith('http') ? file.url : environment.api.baseUrl + file.url;
      this.imageCallback({
        url: url,
        alt: file.alternativeText || file.name,
        width: file.width ?? undefined,
        height: file.height ?? undefined
      });

      this.imageCallback = undefined;
    }

    this.showMediaPicker.set(false);
  }

  onMediaPickerClose(): void {
    this.showMediaPicker.set(false);
    this.imageCallback = undefined;
  }
}
