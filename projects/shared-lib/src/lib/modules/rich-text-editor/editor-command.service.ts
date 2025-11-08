import { Injectable } from '@angular/core';

/**
 * Service pour gérer les commandes de formatage de l'éditeur contenteditable.
 * Encapsule la logique de document.execCommand et la manipulation du DOM.
 */
@Injectable({
  providedIn: 'root'
})
export class EditorCommandService {

  constructor() { }

  /**
   * Exécute une commande de formatage de base (gras, italique, souligné, etc.)
   * @param command La commande à exécuter (ex: 'bold', 'italic', 'insertUnorderedList').
   * @param value La valeur optionnelle pour la commande (ex: nom de police, URL pour 'createLink').
   */
  public executeCommand(command: string, value?: string): void {
    try {
      document.execCommand(command, false, value);
    } catch (error) {
      console.warn(`Erreur lors de l'exécution de la commande: ${command}`, error);
    }
  }

  /**
   * Récupère l'état actuel d'une commande (si elle est active sur la sélection).
   * @param command La commande à vérifier (ex: 'bold', 'italic').
   * @returns Vrai si la commande est active, faux sinon.
   */
  public queryCommandState(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch (error) {
      console.warn(`Erreur lors de la vérification de l'état de la commande: ${command}`, error);
      return false;
    }
  }

  /**
   * Récupère la valeur actuelle d'une commande (ex: nom de police, taille).
   * @param command La commande à vérifier (ex: 'fontName', 'fontSize').
   * @returns La valeur de la commande.
   */
  public queryCommandValue(command: string): string {
    try {
      return document.queryCommandValue(command);
    } catch (error) {
      console.warn(`Erreur lors de la récupération de la valeur de la commande: ${command}`, error);
      return '';
    }
  }

  /**
   * Insère un lien hypertexte avec validation.
   * @param url L'URL du lien.
   */
  public insertLink(url: string): void {
    if (!url || url.trim() === '') {
      console.warn('URL vide pour le lien');
      return;
    }

    // Ajouter le protocole si absent
    let finalUrl = url;
    if (!/^https?:\/\//.test(url) && !/^mailto:/.test(url)) {
      finalUrl = 'https://' + url;
    }

    this.executeCommand('createLink', finalUrl);
  }

  /**
   * Insère une image avec support du responsive design.
   * @param src L'URL de l'image.
   * @param alt Le texte alternatif.
   */
  public insertImage(src: string, alt: string = ''): void {
    if (!src || src.trim() === '') {
      console.warn('URL d\'image vide');
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn('Aucune sélection active');
      return;
    }

    const range = selection.getRangeAt(0);
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '0.5rem 0';
    img.classList.add('img-fluid');

    // Créer un wrapper pour l'image (style Notion)
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.margin = '1rem 0';
    wrapper.appendChild(img);

    range.deleteContents();
    range.insertNode(wrapper);

    // Placer le curseur après l'image
    range.setStartAfter(wrapper);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Applique un format de bloc (H1, H2, P, Blockquote, etc.)
   * @param tag Le nom de la balise de bloc (ex: 'h1', 'p', 'blockquote').
   */
  public formatBlock(tag: string): void {
    // Normaliser le tag
    const normalizedTag = tag.startsWith('<') ? tag : `<${tag}>`;
    this.executeCommand('formatBlock', normalizedTag);
  }

  /**
   * Récupère le nœud de bloc parent de la sélection actuelle.
   * @returns Le nœud de bloc parent ou null.
   */
  public getParentBlockNode(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    let node: Node | null = selection.getRangeAt(0).startContainer;

    // Remonter jusqu'à un élément de bloc (P, H1, DIV, etc.)
    while (node && node.nodeType !== 1) {
      node = node.parentNode;
    }

    if (node instanceof HTMLElement) {
      return node;
    }

    return null;
  }

  /**
   * Récupère le texte sélectionné.
   * @returns Le texte sélectionné ou une chaîne vide.
   */
  public getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
  }

  /**
   * Récupère l'objet Range de la sélection actuelle.
   * @returns L'objet Range ou null.
   */
  public getSelectedRange(): Range | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    return selection.getRangeAt(0);
  }

  /**
   * Restaure une sélection à partir d'un objet Range.
   * @param range L'objet Range à restaurer.
   */
  public restoreSelection(range: Range): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Insère du texte à la position du curseur.
   * @param text Le texte à insérer.
   */
  public insertText(text: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.warn('Aucune sélection active');
      return;
    }

    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Applique une classe CSS à la sélection (pour les styles personnalisés).
   * @param className Le nom de la classe CSS.
   */
  public applyClass(className: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = className;

    try {
      range.surroundContents(span);
    } catch (error) {
      // Si surroundContents échoue (contenu complexe), utiliser une approche alternative
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
  }

  /**
   * Supprime la mise en forme de la sélection.
   */
  public removeFormat(): void {
    this.executeCommand('removeFormat');
  }

  /**
   * Indente la sélection (augmente le retrait).
   */
  public indent(): void {
    this.executeCommand('indent');
  }

  /**
   * Réduit le retrait de la sélection.
   */
  public outdent(): void {
    this.executeCommand('outdent');
  }

  /**
   * Insère une ligne horizontale.
   */
  public insertHorizontalRule(): void {
    this.executeCommand('insertHorizontalRule');
  }

  /**
   * Crée un tableau simple (optionnel, pour les fonctionnalités avancées).
   * @param rows Nombre de lignes.
   * @param cols Nombre de colonnes.
   */
  public insertTable(rows: number, cols: number): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginBottom = '1rem';

    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement(i === 0 ? 'th' : 'td');
        td.style.border = '1px solid #dee2e6';
        td.style.padding = '0.5rem';
        td.textContent = i === 0 ? `En-tête ${j + 1}` : `Cellule ${i}-${j}`;
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    range.deleteContents();
    range.insertNode(table);
    range.setStartAfter(table);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Récupère le HTML de la sélection actuelle.
   * @returns Le HTML de la sélection.
   */
  public getSelectedHTML(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return '';
    }

    const range = selection.getRangeAt(0);
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return div.innerHTML;
  }

  /**
   * Nettoie le HTML en supprimant les balises dangereuses.
   * @param html Le HTML à nettoyer.
   * @returns Le HTML nettoyé.
   */
  public sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Supprimer les scripts et les event handlers
    const scripts = div.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Supprimer les attributs event
    const allElements = div.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return div.innerHTML;
  }
}
