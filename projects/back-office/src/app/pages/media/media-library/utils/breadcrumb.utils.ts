import { MediaFolder } from '../../../../core/models/media/media-file.model';

export interface BreadcrumbItem {
  id: number | null;
  label: string;
  folder?: MediaFolder;
  isEllipsis?: boolean;
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

    // Exclure uniquement les dossiers système techniques
    if (folderName === 'soncollab_admin') return false;
    if (folderName === 'soncollab_content') return false;

    return true;
  });

  const allItems = [...breadcrumbs, ...filteredPath];
  if (allItems.length > 4) {
    const first = allItems[0];
    const secondLast = allItems[allItems.length - 2];
    const last = allItems[allItems.length - 1];

    return [
      first,
      { id: -1, label: '...', isEllipsis: true },
      secondLast,
      last
    ];
  }

  return allItems;
}
