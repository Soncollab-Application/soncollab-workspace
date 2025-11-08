import { Injectable } from '@angular/core';

/**
 * Service interne pour la conversion simple de HTML en Markdown.
 * Remplace Turndown pour éviter une dépendance externe.
 */
@Injectable({
  providedIn: 'root'
})
export class HtmlToMarkdownService {

  constructor() { }

  /**
   * Convertit une chaîne de caractères HTML en Markdown.
   * Cette implémentation est simplifiée et se concentre sur les balises courantes.
   * @param html La chaîne HTML à convertir.
   * @returns La chaîne Markdown résultante.
   */
  public convert(html: string): string {
    if (!html) {
      return '';
    }

    // 1. Créer un élément temporaire pour parser le HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 2. Remplacer les balises par leur équivalent Markdown

    let markdown = tempDiv.innerHTML;

    // Remplacer les balises de formatage de texte
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<p>(.*?)<\/p>/gi, '\n\n$1\n\n');
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '__$1__');
    markdown = markdown.replace(/<del>(.*?)<\/del>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~');

    // Remplacer les titres
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n');
    markdown = markdown.replace(/<h4>(.*?)<\/h4>/gi, '\n#### $1\n');

    // Remplacer les liens
    markdown = markdown.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Remplacer les images
    markdown = markdown.replace(/<img\s+(?:[^>]*?\s+)?src="([^"]*)"\s+(?:[^>]*?\s+)?alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    // Gérer les images sans alt
    markdown = markdown.replace(/<img\s+(?:[^>]*?\s+)?src="([^"]*)"[^>]*>/gi, '![]( $1)');

    // Remplacer les citations (blockquote)
    markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gi, '\n\n> $1\n\n');

    // Remplacer les listes (c'est la partie la plus complexe, on se contente d'une conversion simple)
    // Les listes imbriquées ne seront pas gérées parfaitement par cette approche simple
    markdown = markdown.replace(/<ul>(.*?)<\/ul>/gi, (match: string, content: string) => {
      return content.replace(/<li>(.*?)<\/li>/gi, (liMatch: string, liContent: string) => {
        return `* ${liContent.trim()}\n`;
      });
    });

    markdown = markdown.replace(/<ol>(.*?)<\/ol>/gi, (match: string, content: string) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/gi, (liMatch: string, liContent: string) => {
        return `${counter++}. ${liContent.trim()}\n`;
      });
    });

    // Nettoyage final
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/\n\s*\n/g, '\n\n'); // Supprimer les lignes vides en trop
    markdown = markdown.trim();

    return markdown;
  }
}
