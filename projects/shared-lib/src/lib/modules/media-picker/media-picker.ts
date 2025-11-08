import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
  untracked,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Modal, ModalService } from '../modal';
import {MediaPickerService} from './media-picker.service';
import {MediaItem} from './media-picker.model';
import {FileUpload} from '../file-upload';

@Component({
  selector: 'lib-media-picker',
  standalone: true,
  imports: [CommonModule, TranslatePipe, Modal, FileUpload],
  templateUrl: './media-picker.html',
  styleUrl: './media-picker.css'
})
export class MediaPicker implements OnDestroy {
  private mediaService = inject(MediaPickerService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  @Input() items: MediaItem[] = [];
  @Input() loading = false;
  @Input() uploadUrl?: string;

  @Output() itemsSelected = new EventEmitter<MediaItem[]>();
  @Output() filesUploaded = new EventEmitter<any[]>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() folderChanged = new EventEmitter<string>();

  isOpen = computed(() => this.mediaService.isOpen());
  selectedItems = computed(() => this.mediaService.selectedItems());
  config = computed(() => this.mediaService.config());

  searchQuery = signal('');
  currentFolder = signal('all');
  viewMode = signal<'grid' | 'list'>('grid');

  folders = signal<string[]>(['all', 'images', 'videos', 'documents']);

  constructor() {
    // Déplacer l'effect dans le constructeur
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.modalService.open({
            size: 'xl',
            centered: false,
            backdrop: 'static',
            keyboard: true
          });
        });
      } else {
        untracked(() => {
          if (this.modalService.isOpen()) {
            this.modalService.close();
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.searchChanged.emit(input.value);
  }

  onFolderChange(folder: string): void {
    this.currentFolder.set(folder);
    this.folderChanged.emit(folder);
  }

  selectItem(item: MediaItem): void {
    this.mediaService.selectItem(item);
  }

  isSelected(itemId: number): boolean {
    return this.mediaService.isSelected(itemId);
  }

  confirm(): void {
    const selected = this.selectedItems();
    if (selected.length > 0) {
      this.itemsSelected.emit(selected);
      this.mediaService.confirm();
    }
  }

  close(): void {
    this.mediaService.close();
  }

  onFilesUploaded(files: any[]): void {
    this.filesUploaded.emit(files);
  }

  toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  getItemTypeIcon(type: string): string {
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'videocam';
      case 'audio': return 'audio_file';
      case 'document': return 'description';
      default: return 'insert_drive_file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
