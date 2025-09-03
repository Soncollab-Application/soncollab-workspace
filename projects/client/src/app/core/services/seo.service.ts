import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BlogArticle } from '../../pages/models/blog.model';
import { environment } from '../../../environments/environment';
import { HelpArticle } from '../../pages/models/help.model';

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(
    private meta: Meta,
    private title: Title
  ) {}

  public updateBlogArticleSEO(article: BlogArticle): void {
    const pageTitle = article?.seo_title || article?.title || 'Article';
    const metaDescription = article?.seo_description || article?.excerpt || '';
    const metaKeywords = article?.seo_keywords || article?.tags?.map(tag => tag.name).join(', ') || '';
    const imageUrl = article?.featured_image?.url ?
      (article.featured_image.url.startsWith('http') ? article.featured_image.url : environment.api.baseUrl + article.featured_image.url) :
      '';
    const articleUrl = `${window.location.origin}/blog/${article?.slug || ''}`;

    this.title.setTitle(`${pageTitle} | Blog`);

    this.updateMetaTag('description', metaDescription);
    this.updateMetaTag('keywords', metaKeywords);

    this.updateMetaTag('og:title', pageTitle, 'property');
    this.updateMetaTag('og:description', metaDescription, 'property');
    this.updateMetaTag('og:type', 'article', 'property');
    this.updateMetaTag('og:url', articleUrl, 'property');

    if (imageUrl) {
      this.updateMetaTag('og:image', imageUrl, 'property');
    }

    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', pageTitle);
    this.updateMetaTag('twitter:description', metaDescription);

    if (imageUrl) {
      this.updateMetaTag('twitter:image', imageUrl);
    }

    if (article?.publishedAt) {
      this.updateMetaTag('article:published_time', article.publishedAt, 'property');
    }
    if (article?.author?.username) {
      this.updateMetaTag('article:author', article.author.username, 'property');
    }
    if (article?.category?.name) {
      this.updateMetaTag('article:section', article.category.name, 'property');
    }

    const canonicalUrl = article?.canonical_url || articleUrl;
    this.updateCanonicalUrl(canonicalUrl);
  }

  public updateBlogListSEO(category?: string, tag?: string, searchQuery?: string): void {
    let title = 'Blog | Soncollab';
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
    this.updateMetaTag('description', description);
    this.updateMetaTag('og:title', title, 'property');
    this.updateMetaTag('og:description', description, 'property');
    this.updateMetaTag('og:type', 'website', 'property');
    this.updateMetaTag('og:url', window.location.href, 'property');
    this.updateCanonicalUrl(window.location.href);
  }

  public updateHelpArticleSEO(article: HelpArticle): void {
    const pageTitle = article?.seo_title || article?.title || 'Article d\'aide';
    const metaDescription = article?.seo_description || article?.excerpt || '';
    const canonicalUrl = article?.canonical_url || `${window.location.origin}/help/${article?.slug || ''}`;
    const keywords = article?.search_keywords || '';

    this.title.setTitle(`${pageTitle} | Centre d'aide`);

    this.updateMetaTag('description', metaDescription);
    if (keywords) {
      this.updateMetaTag('keywords', keywords);
    }

    this.updateMetaTag('og:title', pageTitle, 'property');
    this.updateMetaTag('og:description', metaDescription, 'property');
    this.updateMetaTag('og:type', 'article', 'property');
    this.updateMetaTag('og:url', canonicalUrl, 'property');

    this.updateMetaTag('twitter:card', 'summary');
    this.updateMetaTag('twitter:title', pageTitle);
    this.updateMetaTag('twitter:description', metaDescription);

    if (article?.publishedAt) {
      this.updateMetaTag('article:published_time', new Date(article.publishedAt).toISOString(), 'property');
    }
    if (article?.last_updated) {
      this.updateMetaTag('article:modified_time', new Date(article.last_updated).toISOString(), 'property');
    }
    if (article?.author?.username) {
      this.updateMetaTag('article:author', article.author.username, 'property');
    }
    if (article?.category?.name) {
      this.updateMetaTag('article:section', article.category.name, 'property');
    }

    this.updateCanonicalUrl(canonicalUrl);
  }

  public updateHelpListSEO(category?: string, searchQuery?: string): void {
    let title = "Centre d'aide | Soncollab";
    let description = "Trouvez des réponses à vos questions et consultez nos articles pour vous aider à utiliser notre plateforme.";
    const url = window.location.href;

    if (category) {
      title = `Articles sur ${category} | Centre d'aide`;
      description = `Parcourez tous nos articles d'aide pour la catégorie ${category}.`;
    } else if (searchQuery) {
      title = `Recherche : "${searchQuery}" | Centre d'aide`;
      description = `Résultats de la recherche pour "${searchQuery}" dans notre centre d'aide.`;
    }

    this.title.setTitle(title);
    this.updateMetaTag('description', description);
    this.updateMetaTag('og:title', title, 'property');
    this.updateMetaTag('og:description', description, 'property');
    this.updateMetaTag('og:type', 'website', 'property');
    this.updateMetaTag('og:url', url, 'property');
    this.updateCanonicalUrl(url);
  }

  private updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
    if (!content || content.trim() === '') {
      return;
    }
    this.meta.updateTag({ [attribute]: name, content: content.trim() });
  }

  private updateCanonicalUrl(url: string): void {
    if (!url) return;

    let link: HTMLLinkElement | null = document.querySelector(`link[rel='canonical']`);
    if (link) {
      link.setAttribute('href', url);
    } else {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      document.head.appendChild(link);
    }
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
