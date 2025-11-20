import { MediaFile, MediaFolder } from '../../../core/models/media/media-file.model';

export type MediaListItem = MediaFile | MediaFolder;

export interface MediaLibraryFilters {
  folderId?: number;
  folderPath?: string;
  // Ajoutez d'autres filtres si nécessaire
}
