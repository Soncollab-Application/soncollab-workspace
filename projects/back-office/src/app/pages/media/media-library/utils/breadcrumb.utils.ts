// projects/back-office/src/app/pages/media/media-library/utils/breadcrumb.utils.ts

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

  return [...breadcrumbs, ...buildPath(currentFolder)];
}
