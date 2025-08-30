import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BlogArticle } from '../../pages/models/blog.model';
import { BlogUtils } from '../../pages/utils/blog.utils';

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  /**
   * Met à jour les métadonnées SEO pour un article de blog
   */
  updateBlogArticleSEO(article: BlogArticle): void {
    const seoData = BlogUtils.generateSEOMetadata(article);

    // Titre de la page
    this.title.setTitle(`${seoData.title} | Blog`);

    // Métadonnées de base
    this.meta.updateTag({ name: 'description', content: seoData.description });
    this.meta.updateTag({ name: 'keywords', content: seoData.keywords });

    // Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: seoData.title });
    this.meta.updateTag({ property: 'og:description', content: seoData.description });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:url', content: `${window.location.origin}${seoData.url}` });

    if (seoData.image) {
      this.meta.updateTag({ property: 'og:image', content: seoData.image });
    }

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: seoData.title });
    this.meta.updateTag({ name: 'twitter:description', content: seoData.description });

    if (seoData.image) {
      this.meta.updateTag({ name: 'twitter:image', content: seoData.image });
    }

    // Article specific tags
    if (seoData.publishedTime) {
      this.meta.updateTag({ property: 'article:published_time', content: seoData.publishedTime });
    }

    if (seoData.modifiedTime) {
      this.meta.updateTag({ property: 'article:modified_time', content: seoData.modifiedTime });
    }

    if (seoData.author) {
      this.meta.updateTag({ property: 'article:author', content: seoData.author });
    }

    if (seoData.section) {
      this.meta.updateTag({ property: 'article:section', content: seoData.section });
    }

    // Canonical URL
    const canonicalUrl = article.seo?.canonicalURL || `${window.location.origin}${seoData.url}`;

    // Supprimer l'ancienne balise canonical s'il y en a une
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }

    // Ajouter la nouvelle balise canonical
    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'canonical');
    linkElement.setAttribute('href', canonicalUrl);
    document.head.appendChild(linkElement);
  }

  /**
   * Met à jour les métadonnées SEO pour la liste des articles
   */
  updateBlogListSEO(category?: string, tag?: string, searchQuery?: string): void {
    let title = 'Blog';
    let description = 'Découvrez nos derniers articles et actualités.';

    if (category) {
      title = `Articles de la catégorie ${category} | Blog`;
      description = `Tous les articles de la catégorie ${category}.`;
    } else if (tag) {
      title = `Articles avec le tag ${tag} | Blog`;
      description = `Tous les articles avec le tag ${tag}.`;
    } else if (searchQuery) {
      title = `Résultats de recherche pour "${searchQuery}" | Blog`;
      description = `Résultats de recherche pour "${searchQuery}".`;
    }

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph tags
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
  }

  /**
   * Nettoie les métadonnées SEO
   */
  clearSEO(): void {
    // Supprimer les tags spécifiques aux articles
    this.meta.removeTag('property="article:published_time"');
    this.meta.removeTag('property="article:modified_time"');
    this.meta.removeTag('property="article:author"');
    this.meta.removeTag('property="article:section"');

    // Supprimer la balise canonical
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.remove();
    }
  }
}
