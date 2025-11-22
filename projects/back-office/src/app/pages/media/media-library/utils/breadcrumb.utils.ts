import { MediaFolder } from '../../../../core/models/media/media-file.model';

export interface BreadcrumbItem {
  id: number | null;
  label: string;
  folder?: MediaFolder;
  isEllipsis?: boolean;
}

function isInUsersHierarchy(folder: MediaFolder): boolean {
  let current: MediaFolder | null | undefined = folder;
  while (current) {
    if (current.name === 'users' || current.name === 'soncollab_content') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isEmailFolder(folderName: string): boolean {
  return folderName.includes('@');
}

function isSystemFolder(folderName: string): boolean {
  return folderName === 'soncollab_admin' ||
    folderName === 'soncollab_content' ||
    folderName === 'users';
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
  const inUsersHierarchy = isInUsersHierarchy(currentFolder);

  if (inUsersHierarchy) {
    let usersFolder: MediaFolder | null = null;
    let current: MediaFolder | null | undefined = currentFolder;

    while (current) {
      if (current.name === 'users' || current.name === 'soncollab_content') {
        usersFolder = current;
        break;
      }
      current = current.parent;
    }

    if (usersFolder) {
      breadcrumbs.push({
        id: usersFolder.id,
        label: 'Users',
        folder: usersFolder
      });

      const pathAfterUsers = fullPath.filter(item => {
        const folderName = item.folder?.name || '';
        if (isSystemFolder(folderName)) return false;
        return true;
      });

      const finalPath = [...breadcrumbs, ...pathAfterUsers];

      if (finalPath.length > 4) {
        const first = finalPath[0];
        const secondLast = finalPath[finalPath.length - 2];
        const last = finalPath[finalPath.length - 1];

        return [
          first,
          { id: -1, label: '...', isEllipsis: true },
          secondLast,
          last
        ];
      }

      return finalPath;
    }
  }

  const filteredPath = fullPath.filter(item => {
    const folderName = item.folder?.name || '';
    if (isSystemFolder(folderName)) return false;
    return !isEmailFolder(folderName);
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
