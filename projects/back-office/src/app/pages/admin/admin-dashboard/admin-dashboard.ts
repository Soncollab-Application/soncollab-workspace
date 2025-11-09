import { Component, OnInit, inject, effect } from '@angular/core';
import { RichTextEditor, MediaPickerService, MediaItem, MediaPicker, MediaFolder } from 'shared-lib';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RichTextEditor, FormsModule, MediaPicker],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private mediaPickerService = inject(MediaPickerService);

  articleContent: string = '';

  // Mock Media Items - Items à la racine (folder: null)
  mockMediaItems: MediaItem[] = [
    {
      id: 1,
      name: 'paysage-montagne.jpg',
      url: 'https://picsum.photos/1920/1080?random=1',
      thumbnailUrl: 'https://picsum.photos/400/300?random=1',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 2456789,
      width: 1920,
      height: 1080,
      createdAt: new Date('2024-01-15T10:30:00').toISOString(),
      updatedAt: new Date('2024-01-15T10:30:00').toISOString(),
      folder: 'nature',
      tags: ['paysage', 'montagne', 'nature'],
      alt: 'Belle vue sur les montagnes',
      ext: '.jpg'
    },
    {
      id: 2,
      name: 'ocean-vagues.jpg',
      url: 'https://picsum.photos/1920/1080?random=2',
      thumbnailUrl: 'https://picsum.photos/400/300?random=2',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 3123456,
      width: 1920,
      height: 1080,
      createdAt: new Date('2024-03-10T14:20:00').toISOString(),
      updatedAt: new Date('2024-03-10T14:20:00').toISOString(),
      folder: 'nature',
      tags: ['océan', 'mer', 'vagues'],
      alt: 'Vagues de l\'océan',
      ext: '.jpg'
    },
    {
      id: 3,
      name: 'foret-automne.jpg',
      url: 'https://picsum.photos/1920/1080?random=5',
      thumbnailUrl: 'https://picsum.photos/400/300?random=5',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 2789012,
      width: 1920,
      height: 1080,
      createdAt: new Date('2024-08-30T09:15:00').toISOString(),
      updatedAt: new Date('2024-08-30T09:15:00').toISOString(),
      folder: 'nature',
      tags: ['forêt', 'automne', 'couleurs'],
      alt: 'Forêt en automne',
      ext: '.jpg'
    },
    {
      id: 4,
      name: 'logo-entreprise.png',
      url: 'https://picsum.photos/800/600?random=4',
      thumbnailUrl: 'https://picsum.photos/400/300?random=4',
      type: 'image',
      mimeType: 'image/png',
      size: 345678,
      width: 800,
      height: 600,
      createdAt: new Date('2024-07-22T16:45:00').toISOString(),
      updatedAt: new Date('2024-07-22T16:45:00').toISOString(),
      folder: 'branding',
      tags: ['logo', 'branding', 'entreprise'],
      alt: 'Logo de l\'entreprise',
      ext: '.png'
    },
    {
      id: 5,
      name: 'banniere-web.jpg',
      url: 'https://picsum.photos/1920/400?random=6',
      thumbnailUrl: 'https://picsum.photos/400/100?random=6',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 987654,
      width: 1920,
      height: 400,
      createdAt: new Date('2024-09-05T11:30:00').toISOString(),
      updatedAt: new Date('2024-09-05T11:30:00').toISOString(),
      folder: 'branding',
      tags: ['bannière', 'web', 'header'],
      alt: 'Bannière web',
      ext: '.jpg'
    },
    {
      id: 6,
      name: 'presentation-projet.pdf',
      url: 'https://example.com/files/presentation.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: 5678901,
      createdAt: new Date('2024-02-20T13:00:00').toISOString(),
      updatedAt: new Date('2024-02-20T13:00:00').toISOString(),
      folder: 'documents',
      tags: ['présentation', 'projet', 'business'],
      alt: 'Présentation du projet Q1',
      ext: '.pdf'
    },
    {
      id: 7,
      name: 'rapport-annuel-2024.pdf',
      url: 'https://example.com/files/rapport.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: 8901234,
      createdAt: new Date('2024-06-15T08:00:00').toISOString(),
      updatedAt: new Date('2024-06-15T08:00:00').toISOString(),
      folder: 'documents',
      tags: ['rapport', 'annuel', '2024'],
      alt: 'Rapport annuel 2024',
      ext: '.pdf'
    },
    {
      id: 8,
      name: 'demo-video.mp4',
      url: 'https://example.com/videos/demo.mp4',
      thumbnailUrl: 'https://picsum.photos/400/300?random=3',
      type: 'video',
      mimeType: 'video/mp4',
      size: 15678901,
      width: 1920,
      height: 1080,
      duration: 125,
      createdAt: new Date('2024-04-05T15:30:00').toISOString(),
      updatedAt: new Date('2024-04-05T15:30:00').toISOString(),
      folder: 'videos',
      tags: ['démo', 'produit', 'tutoriel'],
      alt: 'Vidéo de démonstration',
      ext: '.mp4'
    },
    {
      id: 9,
      name: 'musique-ambiance.mp3',
      url: 'https://example.com/audio/ambiance.mp3',
      type: 'audio',
      mimeType: 'audio/mpeg',
      size: 4567890,
      duration: 180,
      createdAt: new Date('2024-05-12T12:00:00').toISOString(),
      updatedAt: new Date('2024-05-12T12:00:00').toISOString(),
      folder: 'audio',
      tags: ['musique', 'ambiance', 'background'],
      alt: 'Musique d\'ambiance',
      ext: '.mp3'
    },
    {
      id: 10,
      name: 'archive-photos-2024.zip',
      url: 'https://example.com/archives/photos-2024.zip',
      type: 'archive',
      mimeType: 'application/zip',
      size: 25678901,
      createdAt: new Date('2024-06-18T10:00:00').toISOString(),
      updatedAt: new Date('2024-06-18T10:00:00').toISOString(),
      folder: 'archives',
      tags: ['archive', 'photos', '2024'],
      alt: 'Archive des photos 2024',
      ext: '.zip'
    },
    // Items à la racine (sans dossier)
    {
      id: 11,
      name: 'image-racine-1.jpg',
      url: 'https://picsum.photos/1920/1080?random=11',
      thumbnailUrl: 'https://picsum.photos/400/300?random=11',
      type: 'image',
      mimeType: 'image/jpeg',
      size: 1234567,
      width: 1920,
      height: 1080,
      createdAt: new Date('2024-10-01T10:00:00').toISOString(),
      updatedAt: new Date('2024-10-01T10:00:00').toISOString(),
      folder: null,
      tags: ['racine', 'test'],
      alt: 'Image à la racine 1',
      ext: '.jpg'
    },
    {
      id: 12,
      name: 'document-racine.pdf',
      url: 'https://example.com/files/doc-racine.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: 456789,
      createdAt: new Date('2024-10-05T14:30:00').toISOString(),
      updatedAt: new Date('2024-10-05T14:30:00').toISOString(),
      folder: null,
      tags: ['document', 'racine'],
      alt: 'Document à la racine',
      ext: '.pdf'
    }
  ];

  // Mock Folders - Structure hiérarchique
  mockFolders: MediaFolder[] = [
    // Dossiers racine (parentId: null)
    {
      id: 'nature',
      name: 'Nature',
      path: '/nature',
      parentId: null,
      itemCount: 1, // 1 sous-dossier
      assetCount: 3,
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'branding',
      name: 'Branding',
      path: '/branding',
      parentId: null,
      itemCount: 0,
      assetCount: 2,
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'documents',
      name: 'Documents',
      path: '/documents',
      parentId: null,
      itemCount: 0,
      assetCount: 2,
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'videos',
      name: 'Vidéos',
      path: '/videos',
      parentId: null,
      itemCount: 0,
      assetCount: 1,
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'audio',
      name: 'Audio',
      path: '/audio',
      parentId: null,
      itemCount: 0,
      assetCount: 1,
      createdAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'archives',
      name: 'Archives',
      path: '/archives',
      parentId: null,
      itemCount: 0,
      assetCount: 1,
      createdAt: new Date('2024-01-01').toISOString()
    },
    // Sous-dossier de Nature
    {
      id: 'nature-montagnes',
      name: 'Montagnes',
      path: '/nature/montagnes',
      parentId: 'nature',
      itemCount: 0,
      assetCount: 0,
      createdAt: new Date('2024-01-05').toISOString()
    }
  ];

  constructor() {
    effect(() => {
      const state = this.mediaPickerService.getState();
      console.log('📸 MediaPicker State:', {
        isOpen: state.isOpen,
        selectedCount: state.selectedItems.length,
        selectedItems: state.selectedItems
      });
    });
  }

  ngOnInit(): void {
    this.articleContent = `<h2>Bienvenue dans l'éditeur enrichi !</h2><p>Testez le nouvel éditeur de texte avec MediaPicker intégré style Strapi.</p>`;
    console.log('🎬 Dashboard initialized');
  }

  // Events handlers
  onItemsSelected(items: MediaItem[]): void {
    console.log('✅ Items selected:', items);
  }

  onFilesUploaded(files: File[]): void {
    console.log('📤 Files uploaded:', files);

    // Simuler l'ajout des fichiers dans le dossier courant
    const currentFolder = this.mediaPickerService.currentFilter().folder;

    files.forEach((file, index) => {
      const newItem: MediaItem = {
        id: Date.now() + index,
        name: file.name,
        url: URL.createObjectURL(file),
        thumbnailUrl: URL.createObjectURL(file),
        type: this.getFileType(file.type),
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ext: '.' + file.name.split('.').pop(),
        folder: currentFolder // Utilise le dossier courant ou null pour racine
      };
      this.mockMediaItems = [newItem, ...this.mockMediaItems];
    });

    // Mettre à jour le count du dossier
    if (currentFolder) {
      const folder = this.mockFolders.find(f => f.id === currentFolder);
      if (folder) {
        folder.assetCount += files.length;
        this.mockFolders = [...this.mockFolders];
      }
    }
  }

  onUrlUploaded(url: string): void {
    console.log('🔗 URL uploaded:', url);
  }

  onFilterChanged(filter: any): void {
    console.log('🔍 Filter changed:', filter);
  }

  onFolderCreated(data: { name: string; parentId: string | null }): void {
    console.log('📁 Folder created:', data);

    const newFolder: MediaFolder = {
      id: `${data.parentId ? data.parentId + '-' : ''}${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: data.name,
      path: data.parentId
        ? `${this.mockFolders.find(f => f.id === data.parentId)?.path}/${data.name.toLowerCase().replace(/\s+/g, '-')}`
        : `/${data.name.toLowerCase().replace(/\s+/g, '-')}`,
      parentId: data.parentId,
      itemCount: 0,
      assetCount: 0,
      createdAt: new Date().toISOString()
    };

    this.mockFolders = [...this.mockFolders, newFolder];

    // Mettre à jour le count du dossier parent si existe
    if (data.parentId) {
      const parentFolder = this.mockFolders.find(f => f.id === data.parentId);
      if (parentFolder) {
        parentFolder.itemCount += 1;
        this.mockFolders = [...this.mockFolders];
      }
    }
  }

  onItemDeleted(itemId: number): void {
    console.log('🗑️ Item deleted:', itemId);

    const item = this.mockMediaItems.find(i => i.id === itemId);
    if (item && item.folder) {
      const folder = this.mockFolders.find(f => f.id === item.folder);
      if (folder) {
        folder.assetCount = Math.max(0, folder.assetCount - 1);
        this.mockFolders = [...this.mockFolders];
      }
    }

    this.mockMediaItems = this.mockMediaItems.filter(item => item.id !== itemId);
  }

  onItemEdited(item: MediaItem): void {
    console.log('✏️ Item edited:', item);
    const index = this.mockMediaItems.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.mockMediaItems[index] = { ...item };
      this.mockMediaItems = [...this.mockMediaItems];
    }
  }

  private getFileType(mimeType: string): MediaItem['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    return 'other';
  }
}
