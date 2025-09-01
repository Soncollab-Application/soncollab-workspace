import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BlogArticle } from '../../pages/models/blog.model';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  public updateBlogArticleSEO(article: BlogArticle): void {
    const pageTitle = article.seo_title || article.title;
    const metaDescription = article.seo_description || article.excerpt;
    const metaKeywords = article.seo_keywords || article.tags?.map(tag => tag.name).join(', ') || '';
    const imageUrl = environment.api.baseUrl + article.featured_image?.url || article.featured_image?.url;
    const articleUrl = `${window.location.origin}/blog/${article.slug}`;

    this.title.setTitle(`${pageTitle} | Blog`);

    this.meta.updateTag({ name: 'description', content: metaDescription });
    this.meta.updateTag({ name: 'keywords', content: metaKeywords });

    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: metaDescription });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:url', content: articleUrl });
    if (imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
    }

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: metaDescription });
    if (imageUrl) {
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    }

    if (article.publishedAt) {
      this.meta.updateTag({ property: 'article:published_time', content: article.publishedAt });
    }
    if (article.author?.username) {
      this.meta.updateTag({ property: 'article:author', content: article.author.username });
    }
    if (article.category?.name) {
      this.meta.updateTag({ property: 'article:section', content: article.category.name });
    }

    // CORRECTION : Utilise le champ `canonical_url` directement depuis l'article
    const canonicalUrl = article.canonical_url || articleUrl;
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    if (existingCanonical) {
      existingCanonical.remove();
    }
    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'canonical');
    linkElement.setAttribute('href', canonicalUrl);
    document.head.appendChild(linkElement);
  }

  public updateBlogListSEO(category?: string, tag?: string, searchQuery?: string): void {
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
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
  }

  public clearSEO(): void {
    this.meta.removeTag('property="article:published_time"');
    this.meta.removeTag('property="article:modified_time"');
    this.meta.removeTag('property="article:author"');
    this.meta.removeTag('property="article:section"');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.remove();
    }
  }
}
