import {computed, Injectable, signal} from '@angular/core';
import {EditorMode, EditorState} from './rich-text-editor.model';

@Injectable({ providedIn: 'root' })
export class RichTextEditorService {
  private state = signal<EditorState>({
    content: '',
    mode: 'wysiwyg',
    isDirty: false
  });

  content = computed(() => this.state().content);
  mode = computed(() => this.state().mode);
  isDirty = computed(() => this.state().isDirty);

  setContent(content: string): void {
    this.state.update(state => ({
      ...state,
      content,
      isDirty: true
    }));
  }

  setMode(mode: EditorMode): void {
    this.state.update(state => ({
      ...state,
      mode
    }));
  }

  reset(): void {
    this.state.set({
      content: '',
      mode: 'wysiwyg',
      isDirty: false
    });
  }

  markAsPristine(): void {
    this.state.update(state => ({
      ...state,
      isDirty: false
    }));
  }

  // Conversion HTML -> Markdown
  htmlToMarkdown(html: string): string {
    let markdown = html;

    // Headers
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Bold
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');

    // Italic
    markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');

    // Links
    markdown = markdown.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    markdown = markdown.replace(/<img src="(.*?)" alt="(.*?)".*?>/gi, '![$2]($1)');
    markdown = markdown.replace(/<img src="(.*?)".*?>/gi, '![]($1)');

    // Lists
    markdown = markdown.replace(/<ul>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
    });
    markdown = markdown.replace(/<ol>(.*?)<\/ol>/gis, (match, content) => {
      let index = 1;
      return content.replace(/<li>(.*?)<\/li>/gi, () => `${index++}. $1\n`);
    });

    // Blockquote
    markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gis, (match, content) => {
      return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
    });

    // Code
    markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');

    // Paragraphs
    markdown = markdown.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');

    // Line breaks
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Clean up
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();

    return markdown;
  }

  // Conversion Markdown -> HTML
  markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^######\s+(.*?)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*?)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');

    // Blockquotes
    html = html.replace(/^>\s+(.*?)$/gm, '<blockquote>$1</blockquote>');

    // Paragraphs
    html = html.replace(/^(?!<[hupol]|<blockquote)(.*?)$/gm, '<p>$1</p>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}
