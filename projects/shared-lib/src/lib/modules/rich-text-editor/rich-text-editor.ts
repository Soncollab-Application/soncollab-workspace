import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  OnInit,
  OnDestroy,
  forwardRef,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxEditorModule, Editor, Toolbar, toHTML } from 'ngx-editor';
import { Subject } from 'rxjs';
import {MediaItem, MediaPickerService} from '../media-picker';

@Component({
  selector: 'lib-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, NgxEditorModule],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true
    }
  ]
})
export class RichTextEditor implements OnInit, OnDestroy, ControlValueAccessor {
  private mediaPickerService = inject(MediaPickerService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  @Input() placeholder = '';
  @Input() minHeight = '300px';
  @Input() enableMediaPicker = false;
  @Input() readonly = false;

  @Output() contentChange = new EventEmitter<string>();

  editor!: Editor;
  html = signal('');

  toolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.editor = new Editor({
      attributes: {
        style: `min-height: ${this.minHeight};`
      }
    });
  }

  ngOnDestroy(): void {
    this.editor.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string): void {
    if (value) {
      this.html.set(value);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
  }

  onContentChanged(html: string): void {
    this.html.set(html);
    this.onChange(html);
    this.contentChange.emit(html);
  }

  insertImageFromMediaPicker(): void {
    if (this.enableMediaPicker) {
      this.mediaPickerService.open(
        {
          multiple: false,
          accept: ['image'],
          maxSelection: 1,
          showUpload: false
        },
        (items: MediaItem[]) => {
          if (items[0]) {
            this.insertImage(items[0].url, items[0].name);
          }
        }
      );
    }
  }

  private insertImage(src: string, alt: string = ''): void {
    const img = `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto;">`;
    // Insérer l'image dans l'éditeur
    const selection = this.editor.view.state.selection;
    const transaction = this.editor.view.state.tr.insertText(img, selection.from, selection.to);
    this.editor.view.dispatch(transaction);
  }
}
