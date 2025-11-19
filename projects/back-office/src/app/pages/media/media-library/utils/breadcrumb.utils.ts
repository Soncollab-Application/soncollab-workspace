import { MediaFolder } from '../../../../core/models/media/media-file.model';

export interface BreadcrumbItem {
  id: number | null;
  label: string;
  folder?: MediaFolder;
}

export function getBreadcrumbData(currentFolder: MediaFolder | null): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ id: null, label: 'Media Library' }];

  if (!currentFolder) return breadcrumbs;

  const buildPath = (folder: MediaFolder): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];
    if (folder.parent) {
      items.push(...buildPath(folder.parent));
    }
    items.push({ id: folder.id, label: folder.name, folder });
    return items;
  };

  const fullPath = buildPath(currentFolder);

  const filteredPath = fullPath.filter(item => {
    const folderName = item.folder?.name || '';

    // Exclure les dossiers système
    if (folderName === 'users') return false;
    if (folderName === 'soncollab_admin') return false;
    if (folderName === 'soncollab_content') return false;

    // Exclure les emails (contiennent un @)
    if (folderName.includes('@')) return false;

    return true;
  });

  return [...breadcrumbs, ...filteredPath];
}
