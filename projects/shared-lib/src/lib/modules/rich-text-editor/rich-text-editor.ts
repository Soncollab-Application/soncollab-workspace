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
  ViewEncapsulation,
  AfterViewInit,
  ViewChild,
  ElementRef,
  effect,
  computed, SecurityContext
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';
import { Subject, takeUntil } from 'rxjs';
import { EditorCommandService } from './editor-command.service';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import { ImageResult, MediaResult, MediaType } from './rich-text-editor.model';
import {BypassHtmlPipe} from '../../pipes';

@Component({
  selector: 'lib-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, NgxEditorModule, BypassHtmlPipe],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true
    },
    EditorCommandService,
    HtmlToMarkdownService
  ]
})
export class RichTextEditor implements OnInit, OnDestroy, AfterViewInit, ControlValueAccessor {
  @ViewChild('editorContent', { static: false }) editorContent?: ElementRef<HTMLDivElement>;

  private translate = inject(TranslateService);
  private editorCommandService = inject(EditorCommandService);
  private htmlToMarkdownService = inject(HtmlToMarkdownService);
  private sanitizer = inject(DomSanitizer);
  private destroy$ = new Subject<void>();

  @Input() placeholder = '';
  @Input() minHeight = '300px';
  @Input() enableMediaPicker = false;
  @Input() acceptedMediaTypes: MediaType[] = ['image'];
  @Input() readonly = false;

  @Output() contentChange = new EventEmitter<string>();
  @Output() imageSelectRequested = new EventEmitter<(result: ImageResult | null) => void>();
  @Output() mediaSelectRequested = new EventEmitter<(result: MediaResult | null) => void>();

  html = signal('');
  markdown = signal('');
  isFullScreen = signal(false);
  isPreview = signal(false);

  isBold = signal(false);
  isItalic = signal(false);
  isUnderline = signal(false);
  isStrike = signal(false);
  isOrderedList = signal(false);
  isUnorderedList = signal(false);
  currentBlockTag = signal('richTextEditorShared.commands.paragraph');

  safeHtml(): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, this.html()) || '';
  }

  showImageButton = computed(() =>
    this.enableMediaPicker && this.acceptedMediaTypes.includes('image')
  );

  showMediaButton = computed(() =>
      this.enableMediaPicker && this.acceptedMediaTypes.some(type =>
        type !== 'image' || this.acceptedMediaTypes.length > 1
      )
  );

  blockCommands = [
    { command: 'p', translationKey: 'richTextEditorShared.commands.paragraph' },
    { command: 'h1', translationKey: 'richTextEditorShared.commands.heading1' },
    { command: 'h2', translationKey: 'richTextEditorShared.commands.heading2' },
    { command: 'h3', translationKey: 'richTextEditorShared.commands.heading3' },
    { command: 'blockquote', translationKey: 'richTextEditorShared.commands.blockquote' }
  ];

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  private pendingContent: string | null = null;
  private previewUpdateTimeout: any = null;

  constructor() {
    effect(() => {
      const parentNode = this.editorCommandService.getParentBlockNode();
      if (parentNode) {
        const tag = parentNode.tagName.toLowerCase();
        const block = this.blockCommands.find(b => b.command === tag);
        this.currentBlockTag.set(block?.translationKey || 'richTextEditorShared.commands.paragraph');
      }
    });
  }

  ngOnInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateButtonStates();
      });
  }

  ngAfterViewInit(): void {
    if (this.pendingContent !== null && this.editorContent) {
      this.editorContent.nativeElement.innerHTML = this.pendingContent;
      this.pendingContent = null;
    } else if (this.html() && this.editorContent) {
      this.editorContent.nativeElement.innerHTML = this.html();
    }

    if (this.editorContent) {
      this.editorContent.nativeElement.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;

          const range = selection.getRangeAt(0);
          let node: Node | null = range.startContainer;

          while (node && node !== this.editorContent!.nativeElement) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.getAttribute('data-media-element') === 'true') {
                e.preventDefault();
                const parent = element.parentElement;
                if (parent) {
                  parent.remove();
                  this.onContentChanged();
                }
                return;
              }
            }
            node = node.parentNode;
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string): void {
    const newValue = value !== undefined && value !== null ? value : '';

    this.html.set(newValue);

    if (this.editorContent) {
      this.editorContent.nativeElement.innerHTML = newValue;
    } else {
      this.pendingContent = newValue;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.editorContent) {
      this.editorContent.nativeElement.contentEditable = (!isDisabled).toString();
    }
  }

  onContentChanged(): void {
    if (this.editorContent) {
      const content = this.editorContent.nativeElement.innerHTML;

      this.onChange(content);
      this.contentChange.emit(content);

      if (this.previewUpdateTimeout) {
        clearTimeout(this.previewUpdateTimeout);
      }

      this.previewUpdateTimeout = setTimeout(() => {
        this.html.set(content);
      }, 500);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    if (event.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      let node: Node | null = selection.anchorNode;
      while (node) {
        if (node.nodeName === 'PRE') {
          event.preventDefault();
          document.execCommand('insertHTML', false, '\n');

          const range = selection.getRangeAt(0);
          selection.removeAllRanges();
          selection.addRange(range);

          this.onContentChanged();
          return;
        }
        node = node.parentNode as Node;
      }
    }
  }

  updateButtonStates(): void {
    this.isBold.set(this.editorCommandService.queryCommandState('bold'));
    this.isItalic.set(this.editorCommandService.queryCommandState('italic'));
    this.isUnderline.set(this.editorCommandService.queryCommandState('underline'));
    this.isStrike.set(this.editorCommandService.queryCommandState('strikethrough'));
    this.isOrderedList.set(this.editorCommandService.queryCommandState('insertOrderedList'));
    this.isUnorderedList.set(this.editorCommandService.queryCommandState('insertUnorderedList'));

    const parentNode = this.editorCommandService.getParentBlockNode();
    if (parentNode) {
      const tag = parentNode.tagName.toLowerCase();
      const block = this.blockCommands.find(b => b.command === tag);
      this.currentBlockTag.set(block?.translationKey || 'richTextEditorShared.commands.paragraph');
    } else {
      this.currentBlockTag.set('richTextEditorShared.commands.paragraph');
    }
  }

  applyFormat(command: string): void {
    this.editorCommandService.executeCommand(command);
    this.updateButtonStates();
    this.onContentChanged();
    if (this.editorContent) {
      this.editorContent.nativeElement.focus();
    }
  }

  applyBlockFormat(tag: string): void {
    this.editorCommandService.formatBlock(tag);
    this.updateButtonStates();
    this.onContentChanged();
    if (this.editorContent) {
      this.editorContent.nativeElement.focus();
    }
  }

  insertLink(): void {
    const url = prompt(this.translate.instant('richTextEditorShared.prompts.insertLink'));
    if (url) {
      this.editorCommandService.insertLink(url);
      this.onContentChanged();
      if (this.editorContent) {
        this.editorContent.nativeElement.focus();
      }
    }
  }

  insertImageFromMediaPicker(): void {
    const savedRange = this.editorCommandService.getSelectedRange();

    this.imageSelectRequested.emit((result: ImageResult | null) => {
      if (result) {
        if (this.editorContent) {
          this.editorContent.nativeElement.focus();

          if (savedRange) {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(savedRange);
            }
          } else {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              const editorEl = this.editorContent.nativeElement;

              if (editorEl.lastChild) {
                range.setStartAfter(editorEl.lastChild);
              } else {
                range.setStart(editorEl, 0);
              }
              range.collapse(true);

              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }

        setTimeout(() => {
          this.editorCommandService.insertImage(result.url, result.alt || '');
          this.onContentChanged();

          if (this.editorContent) {
            this.editorContent.nativeElement.focus();
          }
        }, 50);
      }
    });
  }

  insertMediaFromMediaPicker(): void {
    const savedRange = this.editorCommandService.getSelectedRange();

    this.mediaSelectRequested.emit((result: MediaResult | null) => {
      if (result) {
        if (this.editorContent) {
          this.editorContent.nativeElement.focus();

          if (savedRange) {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(savedRange);
            }
          } else {
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              const editorEl = this.editorContent.nativeElement;

              if (editorEl.lastChild) {
                range.setStartAfter(editorEl.lastChild);
              } else {
                range.setStart(editorEl, 0);
              }
              range.collapse(true);

              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }

        setTimeout(() => {
          this.insertMediaElement(result);
          this.onContentChanged();

          if (this.editorContent) {
            this.editorContent.nativeElement.focus();
          }
        }, 50);
      }
    });
  }

  private insertMediaElement(media: MediaResult): void {
    const editorEl = this.editorContent?.nativeElement;
    if (!editorEl) return;

    switch (media.type) {
      case 'image':
        const imgWrapper = document.createElement('p');
        imgWrapper.style.textAlign = 'left';

        const img = document.createElement('img');
        img.src = media.url;
        img.alt = media.alt || media.name;
        img.style.cssText = 'width: 200px; max-width: 200px; height: auto; display: inline-block; margin: 0.5rem 0; border-radius: 0.25rem; vertical-align: middle;';
        imgWrapper.appendChild(img);

        this.insertElementInEditor(imgWrapper, editorEl);
        break;

      case 'video':
        const videoWrapper = document.createElement('p');

        const videoContainer = document.createElement('span');
        videoContainer.contentEditable = 'false';
        videoContainer.className = 'd-inline-flex flex-column gap-2 p-2 border rounded bg-body';
        videoContainer.style.cssText = 'cursor: default; max-width: 400px; user-select: none;';
        videoContainer.setAttribute('data-media-element', 'true');

        const videoPreview = document.createElement('video');
        videoPreview.style.cssText = 'width: 100%; height: auto; border-radius: 0.25rem; pointer-events: none; max-width: 100%;';

        const videoSource = document.createElement('source');
        videoSource.src = media.url;
        videoSource.type = media.mime;
        videoPreview.appendChild(videoSource);

        const videoInfoContainer = document.createElement('span');
        videoInfoContainer.className = 'd-flex align-items-center gap-2';
        videoInfoContainer.style.display = 'flex';

        const videoIcon = document.createElement('span');
        videoIcon.className = 'material-symbols-outlined text-primary';
        videoIcon.style.fontSize = '20px';
        videoIcon.textContent = 'videocam';

        const videoTextContainer = document.createElement('span');
        videoTextContainer.className = 'd-flex flex-column flex-grow-1 text-truncate';
        videoTextContainer.style.display = 'flex';

        const videoName = document.createElement('strong');
        videoName.className = 'text-truncate';
        videoName.style.fontSize = '13px';
        videoName.textContent = media.name;
        videoTextContainer.appendChild(videoName);

        if (media.size) {
          const videoSize = document.createElement('small');
          videoSize.className = 'text-muted';
          videoSize.style.fontSize = '11px';
          videoSize.textContent = this.formatFileSize(media.size);
          videoTextContainer.appendChild(videoSize);
        }

        const videoPlayBtn = document.createElement('button');
        videoPlayBtn.type = 'button';
        videoPlayBtn.className = 'btn btn-icon btn-sm btn-outline-primary fs-base rounded-circle';
        videoPlayBtn.setAttribute('aria-label', 'Play');

        const videoPlayIcon = document.createElement('i');
        videoPlayIcon.className = 'material-symbols-outlined';
        videoPlayIcon.textContent = 'play_arrow';
        videoPlayBtn.appendChild(videoPlayIcon);

        let videoIsPlaying = false;
        videoPlayBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (videoIsPlaying) {
            videoPreview.pause();
            videoPlayIcon.textContent = 'play_arrow';
            videoIsPlaying = false;
          } else {
            videoPreview.play();
            videoPlayIcon.textContent = 'pause';
            videoIsPlaying = true;
          }
        };

        videoPreview.onended = () => {
          videoPlayIcon.textContent = 'play_arrow';
          videoIsPlaying = false;
        };

        videoInfoContainer.appendChild(videoIcon);
        videoInfoContainer.appendChild(videoTextContainer);
        videoInfoContainer.appendChild(videoPlayBtn);

        videoContainer.appendChild(videoPreview);
        videoContainer.appendChild(videoInfoContainer);
        videoWrapper.appendChild(videoContainer);

        this.insertElementInEditor(videoWrapper, editorEl);
        break;

      case 'audio':
        const audioWrapper = document.createElement('p');

        const audioContainer = document.createElement('span');
        audioContainer.contentEditable = 'false';
        audioContainer.className = 'd-inline-flex align-items-center gap-2 px-3 py-2 border rounded bg-body';
        audioContainer.style.cssText = 'cursor: default; max-width: 400px; user-select: none;';
        audioContainer.setAttribute('data-media-element', 'true');

        const audioIcon = document.createElement('span');
        audioIcon.className = 'material-symbols-outlined text-primary';
        audioIcon.style.fontSize = '20px';
        audioIcon.textContent = 'audio_file';

        const audioTextContainer = document.createElement('span');
        audioTextContainer.className = 'd-flex flex-column flex-grow-1 text-truncate';

        const audioName = document.createElement('strong');
        audioName.className = 'text-truncate';
        audioName.style.fontSize = '13px';
        audioName.textContent = media.name;
        audioTextContainer.appendChild(audioName);

        if (media.size) {
          const audioSize = document.createElement('small');
          audioSize.className = 'text-muted';
          audioSize.style.fontSize = '11px';
          audioSize.textContent = this.formatFileSize(media.size);
          audioTextContainer.appendChild(audioSize);
        }

        const audioPlayBtn = document.createElement('button');
        audioPlayBtn.type = 'button';
        audioPlayBtn.className = 'btn btn-icon btn-sm btn-outline-primary fs-base rounded-circle';
        audioPlayBtn.setAttribute('aria-label', 'Play');

        const audioPlayIcon = document.createElement('i');
        audioPlayIcon.className = 'material-symbols-outlined';
        audioPlayIcon.textContent = 'play_arrow';
        audioPlayBtn.appendChild(audioPlayIcon);

        const audio = document.createElement('audio');
        audio.style.display = 'none';
        const audioSource = document.createElement('source');
        audioSource.src = media.url;
        audioSource.type = media.mime;
        audio.appendChild(audioSource);

        let audioIsPlaying = false;
        audioPlayBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (audioIsPlaying) {
            audio.pause();
            audioPlayIcon.textContent = 'play_arrow';
            audioIsPlaying = false;
          } else {
            audio.play();
            audioPlayIcon.textContent = 'pause';
            audioIsPlaying = true;
          }
        };

        audio.onended = () => {
          audioPlayIcon.textContent = 'play_arrow';
          audioIsPlaying = false;
        };

        audioContainer.appendChild(audioIcon);
        audioContainer.appendChild(audioTextContainer);
        audioContainer.appendChild(audioPlayBtn);
        audioContainer.appendChild(audio);

        audioWrapper.appendChild(audioContainer);
        this.insertElementInEditor(audioWrapper, editorEl);
        break;

      case 'document':
      case 'archive':
      case 'other':
        const icon = this.getFileIcon(media.mime);
        const size = media.size ? this.formatFileSize(media.size) : '';

        const fileWrapper = document.createElement('p');

        const fileContainer = document.createElement('span');
        fileContainer.contentEditable = 'false';
        fileContainer.className = 'd-inline-flex align-items-center gap-2 px-3 py-2 border rounded bg-body';
        fileContainer.style.cssText = 'cursor: pointer;';
        fileContainer.setAttribute('data-media-element', 'true');

        const link = document.createElement('a');
        link.href = media.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'd-flex align-items-center gap-2 text-decoration-none text-body';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-symbols-outlined text-primary';
        iconSpan.style.fontSize = '24px';
        iconSpan.textContent = icon;

        const textContainer = document.createElement('span');
        textContainer.className = 'd-flex flex-column';

        const fileName = document.createElement('strong');
        fileName.style.fontSize = '14px';
        fileName.textContent = media.name;
        textContainer.appendChild(fileName);

        if (size) {
          const sizeSmall = document.createElement('small');
          sizeSmall.className = 'text-muted';
          sizeSmall.style.fontSize = '12px';
          sizeSmall.textContent = size;
          textContainer.appendChild(sizeSmall);
        }

        link.appendChild(iconSpan);
        link.appendChild(textContainer);
        fileContainer.appendChild(link);
        fileWrapper.appendChild(fileContainer);

        this.insertElementInEditor(fileWrapper, editorEl);
        break;
    }
  }

  private insertElementInEditor(element: HTMLElement, editorEl: HTMLElement): void {
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      let node = range.commonAncestorContainer;
      let isInEditor = false;

      while (node) {
        if (node === editorEl) {
          isInEditor = true;
          break;
        }
        node = node.parentNode as Node;
      }

      if (!isInEditor) {
        range.selectNodeContents(editorEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      range.deleteContents();
      range.insertNode(element);

      const emptyP = document.createElement('p');
      emptyP.innerHTML = '<br>';

      if (element.nextSibling) {
        element.parentNode?.insertBefore(emptyP, element.nextSibling);
      } else {
        element.parentNode?.appendChild(emptyP);
      }

      range.setStart(emptyP, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorEl.appendChild(element);

      const emptyP = document.createElement('p');
      emptyP.innerHTML = '<br>';
      editorEl.appendChild(emptyP);

      const range = document.createRange();
      range.setStart(emptyP, 0);
      range.collapse(true);

      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    editorEl.focus();
  }

  private getFileIcon(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'videocam';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('sheet') || mime.includes('excel')) return 'table_chart';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'folder_zip';
    return 'insert_drive_file';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  toggleFullScreen(): void {
    this.isFullScreen.update(v => !v);
    const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');

    if (this.isFullScreen()) {
      document.body.style.overflow = 'hidden';
      wrapper?.classList.add('fullscreen');

      if (this.editorContent) {
        const currentHtml = this.editorContent.nativeElement.innerHTML;
        this.html.set(currentHtml);
      }
      this.isPreview.set(true);
    } else {
      document.body.style.overflow = '';
      wrapper?.classList.remove('fullscreen');
      this.isPreview.set(false);
    }
  }

  togglePreview(): void {
    if (!this.isPreview() && this.editorContent) {
      const currentHtml = this.editorContent.nativeElement.innerHTML;
      this.html.set(currentHtml);
    }
    this.isPreview.update(v => !v);
  }
}
