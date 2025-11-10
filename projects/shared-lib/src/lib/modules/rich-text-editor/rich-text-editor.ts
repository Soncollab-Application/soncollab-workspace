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
  effect, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';
import { Subject, takeUntil } from 'rxjs';
import { EditorCommandService } from './editor-command.service';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import {DomSanitizer} from '@angular/platform-browser';

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

  // État du contenu
  html = signal('');
  markdown = signal('');
  isFullScreen = signal(false);
  isPreview = signal(false);

  // État des boutons de formatage
  isBold = signal(false);
  isItalic = signal(false);
  isUnderline = signal(false);
  isStrike = signal(false);
  isOrderedList = signal(false);
  isUnorderedList = signal(false);
  currentBlockTag = signal('richTextEditorShared.commands.paragraph');

  safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  // Commandes de blocs avec traduction
  blockCommands = [
    { command: 'p', translationKey: 'richTextEditorShared.commands.paragraph' },
    { command: 'h1', translationKey: 'richTextEditorShared.commands.heading1' },
    { command: 'h2', translationKey: 'richTextEditorShared.commands.heading2' },
    { command: 'h3', translationKey: 'richTextEditorShared.commands.heading3' },
    { command: 'blockquote', translationKey: 'richTextEditorShared.commands.blockquote' }
  ];

  // ControlValueAccessor
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    // Effect pour gérer le changement de langue
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
    // Écouter les changements de langue
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

    // Nettoyer le mode fullscreen si actif
    if (this.isFullScreen()) {
      document.body.style.overflow = '';
      const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');
      if (wrapper) {
        wrapper.classList.remove('fullscreen');
      }
    }
  }

  // ControlValueAccessor implementation
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

  /**
   * Gestion du contenu de l'éditeur
   */
  onContentChanged(): void {
    if (this.editorContent) {
      const htmlContent = this.editorCommandService.sanitizeHTML(this.editorContent.nativeElement.innerHTML);
      this.html.set(htmlContent);
      this.markdown.set(this.htmlToMarkdownService.convert(htmlContent));
      this.onChange(htmlContent);
      this.contentChange.emit(htmlContent);
    }
  }

  /**
   * Met à jour l'état des boutons de formatage
   */
  updateButtonStates(): void {
    this.isBold.set(this.editorCommandService.queryCommandState('bold'));
    this.isItalic.set(this.editorCommandService.queryCommandState('italic'));
    this.isUnderline.set(this.editorCommandService.queryCommandState('underline'));
    this.isStrike.set(this.editorCommandService.queryCommandState('strikethrough'));
    this.isOrderedList.set(this.editorCommandService.queryCommandState('insertOrderedList'));
    this.isUnorderedList.set(this.editorCommandService.queryCommandState('insertUnorderedList'));

    // Mise à jour du tag de bloc actuel avec traduction
    const parentNode = this.editorCommandService.getParentBlockNode();
    if (parentNode) {
      const tag = parentNode.tagName.toLowerCase();
      const block = this.blockCommands.find(b => b.command === tag);
      this.currentBlockTag.set(block?.translationKey || 'richTextEditorShared.commands.paragraph');
    } else {
      this.currentBlockTag.set('richTextEditorShared.commands.paragraph');
    }
  }

  /**
   * Applique une commande de formatage
   */
  applyFormat(command: string): void {
    this.editorCommandService.executeCommand(command);
    this.updateButtonStates();
    this.onContentChanged();
    if (this.editorContent) {
      this.editorContent.nativeElement.focus();
    }
  }

  /**
   * Applique un format de bloc
   */
  applyBlockFormat(tag: string): void {
    this.editorCommandService.formatBlock(tag);
    this.updateButtonStates();
    this.onContentChanged();
    if (this.editorContent) {
      this.editorContent.nativeElement.focus();
    }
  }

  /**
   * Insère un lien
   */
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

  /**
   * Insère une image depuis le Media Picker
   */
  insertImageFromMediaPicker(): void {
    console.log('insertImageFromMediaPicker called', {
      enableMediaPicker: this.enableMediaPicker
    });

    if (this.enableMediaPicker) {
      console.log('Opening media picker...');
    } else {
      console.log('enableMediaPicker is false');
    }
  }

  /**
   * Bascule le mode plein écran
   */
  toggleFullScreen(): void {
    const newValue = !this.isFullScreen();
    this.isFullScreen.set(newValue);

    if (newValue) {
      const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');
      if (wrapper) {
        wrapper.classList.add('fullscreen');
        document.body.style.overflow = 'hidden';
      }
    } else {
      const wrapper = this.editorContent?.nativeElement.closest('.rich-text-editor-wrapper');
      if (wrapper) {
        wrapper.classList.remove('fullscreen');
        document.body.style.overflow = '';
      }
    }
  }

  /**
   * Bascule le mode prévisualisation
   */
  togglePreview(): void {
    const wasInPreview = this.isPreview();

    if (wasInPreview) {
      // Revenir en mode édition
      this.isPreview.set(false);

      // Attendre que le DOM soit mis à jour puis restaurer le contenu
      setTimeout(() => {
        if (this.editorContent) {
          this.editorContent.nativeElement.innerHTML = this.html();
          this.editorContent.nativeElement.focus();
        }
      }, 0);
    } else {
      // Passer en mode preview - sauvegarder le contenu actuel
      if (this.editorContent) {
        const htmlContent = this.editorCommandService.sanitizeHTML(this.editorContent.nativeElement.innerHTML);
        this.html.set(htmlContent);
        this.markdown.set(this.htmlToMarkdownService.convert(htmlContent));
      }
      this.isPreview.set(true);
    }
  }

  /**
   * Récupère le contenu en Markdown
   */
  getMarkdown(): string {
    return this.markdown();
  }

  /**
   * Récupère le contenu en HTML
   */
  getHTML(): string {
    return this.html();
  }

  /**
   * Réinitialise le contenu de l'éditeur
   */
  clear(): void {
    this.html.set('');
    this.markdown.set('');
    if (this.editorContent) {
      this.editorContent.nativeElement.innerHTML = '';
    }
    this.onChange('');
    this.contentChange.emit('');
  }
}
