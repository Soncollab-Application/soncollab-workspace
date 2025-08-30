export class BlogUtils {
  /**
   * Calcule le temps de lecture estimé basé sur le nombre de mots
   */
  static calculateReadTime(content: string, wordsPerMinute: number = 200): number {
    if (!content) return 0;

    // Supprimer les balises HTML pour compter seulement le texte
    const textContent = content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * Tronque le texte à un nombre de caractères donné
   */
  static truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + suffix;
  }

  /**
   * Extrait le premier paragraphe d'un contenu HTML
   */
  static extractFirstParagraph(htmlContent: string, maxLength: number = 150): string {
    if (!htmlContent) return '';

    // Supprimer les balises HTML
    const textContent = htmlContent.replace(/<[^>]*>/g, '');

    // Trouver le premier point ou nouvelle ligne
    const firstSentence = textContent.split(/[.\n]/)[0];

    return this.truncateText(firstSentence, maxLength);
  }

  /**
   * Génère une URL de slug à partir d'un titre
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s-]/g, '') // Garder seulement lettres, chiffres, espaces et tirets
      .replace(/\s+/g, '-') // Remplacer espaces par tirets
      .replace(/-+/g, '-') // Éviter les tirets multiples
      .replace(/^-+|-+$/g, ''); // Supprimer tirets au début et fin
  }

  /**
   * Formate une date selon la locale
   */
  static formatDate(date: string | Date, locale: string = 'fr-FR', options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return dateObj.toLocaleDateString(locale, options || defaultOptions);
  }

  /**
   * Génère des métadonnées SEO pour un article
   */
  static generateSEOMetadata(article: any): any {
    return {
      title: article.seo?.metaTitle || article.title,
      description: article.seo?.metaDescription || article.excerpt || this.extractFirstParagraph(article.content),
      keywords: article.seo?.keywords || article.tags?.map((tag: any) => tag.name).join(', '),
      image: article.featuredImage?.url,
      url: `/blog/${article.slug}`,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      author: article.author?.name,
      section: article.category?.name
    };
  }

  /**
   * Valide la structure d'un article de blog
   */
  static validateBlogArticle(article: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!article.title || article.title.trim().length === 0) {
      errors.push('Le titre est requis');
    }

    if (!article.slug || article.slug.trim().length === 0) {
      errors.push('Le slug est requis');
    }

    if (!article.content || article.content.trim().length === 0) {
      errors.push('Le contenu est requis');
    }

    if (!article.publishedAt) {
      errors.push('La date de publication est requise');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Filtre les articles par critères de recherche
   */
  static filterArticles(
    articles: any[],
    searchTerm: string = '',
    categorySlug?: string,
    tagSlug?: string
  ): any[] {
    return articles.filter(article => {
      // Filtrage par terme de recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          article.title.toLowerCase().includes(searchLower) ||
          (article.excerpt && article.excerpt.toLowerCase().includes(searchLower)) ||
          (article.content && article.content.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Filtrage par catégorie
      if (categorySlug && (!article.category || article.category.slug !== categorySlug)) {
        return false;
      }

      // Filtrage par tag
      if (tagSlug && (!article.tags || !article.tags.some((tag: any) => tag.slug === tagSlug))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Trie les articles selon différents critères
   */
  static sortArticles(articles: any[], sortBy: 'newest' | 'oldest' | 'popular' | 'title' = 'newest'): any[] {
    const sortedArticles = [...articles];

    switch (sortBy) {
      case 'newest':
        return sortedArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      case 'oldest':
        return sortedArticles.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

      case 'popular':
        // Tri par nombre de vues ou likes si disponible, sinon par date
        return sortedArticles.sort((a, b) => {
          const aPopularity = a.views || a.likes || 0;
          const bPopularity = b.views || b.likes || 0;
          return bPopularity - aPopularity;
        });

      case 'title':
        return sortedArticles.sort((a, b) => a.title.localeCompare(b.title));

      default:
        return sortedArticles;
    }
  }

  /**
   * Génère des couleurs pour les catégories
   */
  static getCategoryColor(categoryName: string): string {
    const colors = [
      '#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#dc3545',
      '#fd7e14', '#ffc107', '#28a745', '#20c997', '#17a2b8'
    ];

    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }
}
