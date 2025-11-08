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
  ViewEncapsulation, AfterViewInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxEditorModule, Editor, Toolbar, toHTML } from 'ngx-editor';
import { Subject } from 'rxjs';
import {MediaItem, MediaPickerService} from '../media-picker';
import {EditorCommandService} from './editor-command.service';
import {HtmlToMarkdownService} from './html-to-markdown.service';

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
  @ViewChild('editorContent', { static: false }) editorContent!: ElementRef<HTMLDivElement>;

  private mediaPickerService = inject(MediaPickerService);
  private translate = inject(TranslateService);
  private editorCommandService = inject(EditorCommandService);
  private htmlToMarkdownService = inject(HtmlToMarkdownService);
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
  currentBlockTag = signal('Paragraphe');

  // Commandes de formatage disponibles
  formatCommands = [
    { command: 'bold', icon: 'bi-type-bold', label: 'Gras', shortcut: 'Ctrl+B' },
    { command: 'italic', icon: 'bi-type-italic', label: 'Italique', shortcut: 'Ctrl+I' },
    { command: 'underline', icon: 'bi-type-underline', label: 'Souligné', shortcut: 'Ctrl+U' },
    { command: 'strikethrough', icon: 'bi-type-strikethrough', label: 'Barré', shortcut: '' }
  ];

  blockCommands = [
    { command: 'h1', label: 'Titre 1' },
    { command: 'h2', label: 'Titre 2' },
    { command: 'h3', label: 'Titre 3' },
    { command: 'p', label: 'Paragraphe' },
    { command: 'blockquote', label: 'Citation' }
  ];

  listCommands = [
    { command: 'insertUnorderedList', icon: 'bi-list-ul', label: 'Liste à puces' },
    { command: 'insertOrderedList', icon: 'bi-list-ol', label: 'Liste numérotée' }
  ];

  private onChange: (value: string) => void = () => {};
  public onTouched: () => void = () => {};

  ngOnInit(): void {
    // Initialisation si nécessaire
  }

  ngAfterViewInit(): void {
    // Initialiser le contenu si une valeur a été définie avant la vue
    if (this.html() && this.editorContent) {
      this.editorContent.nativeElement.innerHTML = this.html();
    }

    // Écouter les changements de sélection pour mettre à jour l'état des boutons
    if (this.editorContent) {
      this.editorContent.nativeElement.addEventListener('mouseup', () => this.updateButtonStates());
      this.editorContent.nativeElement.addEventListener('keyup', () => this.updateButtonStates());
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Implémentation de ControlValueAccessor
   */
  writeValue(value: string): void {
    if (value) {
      this.html.set(value);
      if (this.editorContent) {
        this.editorContent.nativeElement.innerHTML = value;
      }
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
    if (this.editorContent) {
      this.editorContent.nativeElement.contentEditable = isDisabled ? 'false' : 'true';
    }
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
    const url = prompt(this.translate.instant('richTextEditorShared.prompts.linkUrl'));
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
            const altText = prompt(this.translate.instant('richTextEditorShared.prompts.imageAlt'), items[0].name);
            this.editorCommandService.insertImage(items[0].url, altText || items[0].name);
            this.onContentChanged();
            if (this.editorContent) {
              this.editorContent.nativeElement.focus();
            }
          }
        }
      );
    }
  }

  /**
   * Met à jour l'état des boutons de formatage en fonction de la sélection
   */
  updateButtonStates(): void {
    this.isBold.set(this.editorCommandService.queryCommandState('bold'));
    this.isItalic.set(this.editorCommandService.queryCommandState('italic'));
    this.isUnderline.set(this.editorCommandService.queryCommandState('underline'));
    this.isStrike.set(this.editorCommandService.queryCommandState('strikethrough'));
    this.isOrderedList.set(this.editorCommandService.queryCommandState('insertOrderedList'));
    this.isUnorderedList.set(this.editorCommandService.queryCommandState('insertUnorderedList'));

    // Mise à jour du tag de bloc actuel
    const parentNode = this.editorCommandService.getParentBlockNode();
    if (parentNode) {
      const tag = parentNode.tagName.toLowerCase();
      const block = this.blockCommands.find(b => b.command === tag);
      this.currentBlockTag.set(block ? block.label : 'Paragraphe');
    } else {
      this.currentBlockTag.set('Paragraphe');
    }
  }

  /**
   * Bascule le mode plein écran
   */
  toggleFullScreen(): void {
    this.isFullScreen.set(!this.isFullScreen());
  }

  /**
   * Bascule le mode prévisualisation
   */
  togglePreview(): void {
    this.isPreview.set(!this.isPreview());
    if (this.isPreview()) {
      // S'assurer que le contenu est à jour avant de passer en prévisualisation
      this.onContentChanged();
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
