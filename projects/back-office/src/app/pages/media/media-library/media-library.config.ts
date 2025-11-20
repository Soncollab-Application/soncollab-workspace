import {
  ListStateConfig,
  ListColumn,
  ListAction,
  FilterConfig,
  SortOption,
  FilterValue,
  ListStateManager,
} from 'shared-lib';
import { MediaFile, MediaFolder, SortOption as MediaSortOption } from '../../../core/models/media/media-file.model';
import { MediaLibraryFilters } from './media-library.model';

// Définir un type unifié pour les éléments de la liste (fichiers et dossiers)
export type MediaListItem = MediaFile | MediaFolder;

// Configuration de l'état de la liste
export const MEDIA_LIBRARY_STATE_CONFIG: ListStateConfig<MediaListItem, MediaLibraryFilters> = {
  initialSort: 'createdAt:DESC' as MediaSortOption,
  initialFilters: {
    // Les filtres de dossier seront gérés par le composant lui-même via le ListStateManager
    // pour s'assurer qu'ils sont toujours présents dans la requête.
  },
  // La fonction de chargement sera injectée dans le composant
  loadData: (manager: ListStateManager<MediaListItem, MediaLibraryFilters>) => {
    // Cette fonction sera implémentée dans le composant pour appeler le MediaService
    // et gérer la fusion des fichiers et des dossiers.
    throw new Error('loadData must be implemented in MediaLibrary component');
  },
  // Fonction pour extraire l'ID unique de l'élément
  getItemId: (item: MediaListItem) => `${item.type}-${item.id}`,
  // La liste des actions et des colonnes sera définie dans le composant
  // car elle dépendra du mode de vue (grille/liste) et du type d'élément.
};

// Configuration des colonnes pour le mode liste (DataList)
export const MEDIA_LIBRARY_COLUMNS: ListColumn<MediaListItem>[] = [
  {
    id: 'name',
    label: 'mediaLibrary.columns.name',
    sortable: true,
    render: (item: MediaListItem) => item.name,
  },
  {
    id: 'type',
    label: 'mediaLibrary.columns.type',
    sortable: false,
    render: (item: MediaListItem) => item.type === 'folder' ? 'Dossier' : item.mime,
  },
  {
    id: 'size',
    label: 'mediaLibrary.columns.size',
    sortable: true,
    render: (item: MediaListItem) => (item.type === 'asset' ? (item.size / 1024).toFixed(2) + ' KB' : '-'),
  },
  {
    id: 'createdAt',
    label: 'mediaLibrary.columns.createdAt',
    sortable: true,
    render: (item: MediaListItem) => new Date(item.createdAt).toLocaleDateString(),
  },
];

// Configuration des actions (à adapter selon les besoins)
export const MEDIA_LIBRARY_ACTIONS: ListAction<MediaListItem>[] = [
  {
    id: 'open',
    label: 'mediaLibrary.actions.open',
    icon: 'folder_open',
    condition: (item: MediaListItem) => item.type === 'folder',
  },
  {
    id: 'download',
    label: 'mediaLibrary.actions.download',
    icon: 'download',
    condition: (item: MediaListItem) => item.type === 'asset',
  },
  {
    id: 'rename',
    label: 'mediaLibrary.actions.rename',
    icon: 'edit',
    condition: (item: MediaListItem) => true, // Tous les éléments peuvent être renommés
  },
  {
    id: 'delete',
    label: 'mediaLibrary.actions.delete',
    icon: 'delete',
    condition: (item: MediaListItem) => true, // Tous les éléments peuvent être supprimés
  },
];

// Configuration des filtres (à adapter si des filtres autres que le dossier sont nécessaires)
export const MEDIA_LIBRARY_FILTERS: FilterConfig<MediaLibraryFilters>[] = [
  // Exemple de filtre par type de fichier (si nécessaire)
  // {
  //   id: 'mime',
  //   label: 'mediaLibrary.filters.mime',
  //   type: 'select',
  //   options: [
  //     { value: 'image', label: 'Images' },
  //     { value: 'video', label: 'Vidéos' },
  //   ],
  // },
];

// Définir le modèle de filtre pour la Media Library
export interface MediaLibraryFilters {
  folderId?: number;
  folderPath?: string;
  // Ajoutez d'autres filtres si nécessaire
}
