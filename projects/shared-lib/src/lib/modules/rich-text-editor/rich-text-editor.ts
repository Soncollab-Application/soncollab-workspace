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
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';
import { Subject, takeUntil } from 'rxjs';
import { EditorCommandService } from './editor-command.service';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ImageResult } from './rich-text-editor.model';

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
  @Input() readonly = false;

  @Output() contentChange = new EventEmitter<string>();
  @Output() imageSelectRequested = new EventEmitter<(result: ImageResult | null) => void>();

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

  safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  blockCommands = [
    { command: 'p', translationKey: 'richTextEditorShared.commands.paragraph' },
    { command: 'h1', translationKey: 'richTextEditorShared.commands.heading1' },
    { command: 'h2', translationKey: 'richTextEditorShared.commands.heading2' },
    { command: 'h3', translationKey: 'richTextEditorShared.commands.heading3' },
    { command: 'blockquote', translationKey: 'richTextEditorShared.commands.blockquote' }
  ];

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

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
    if (this.editorContent && this.html()) {
      this.editorContent.nativeElement.innerHTML = this.html();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.isFullScreen()) {
      document.body.style.overflow = '';
      const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');
      if (wrapper) {
        wrapper.classList.remove('fullscreen');
      }
    }
  }

  writeValue(value: string): void {
    this.html.set(value || '');
    if (this.editorContent) {
      this.editorContent.nativeElement.innerHTML = value || '';
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

  onContentChanged(): void {
    if (this.editorContent) {
      const htmlContent = this.editorCommandService.sanitizeHTML(this.editorContent.nativeElement.innerHTML);
      this.html.set(htmlContent);
      this.markdown.set(this.htmlToMarkdownService.convert(htmlContent));
      this.onChange(htmlContent);
      this.contentChange.emit(htmlContent);
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


  toggleFullScreen(): void {
    this.isFullScreen.update(v => !v);
    const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');

    if (this.isFullScreen()) {
      document.body.style.overflow = 'hidden';
      wrapper?.classList.add('fullscreen');
    } else {
      document.body.style.overflow = '';
      wrapper?.classList.remove('fullscreen');
    }
  }

  togglePreview(): void {
    this.isPreview.update(v => !v);
  }
}
