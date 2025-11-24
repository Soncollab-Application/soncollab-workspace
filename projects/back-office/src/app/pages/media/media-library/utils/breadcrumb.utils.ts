import { MediaFolder } from '../../../../core/models/media/media-file.model';

export interface BreadcrumbItem {
  id: number | null;
  label: string;
  folder?: MediaFolder;
  isEllipsis?: boolean;
}

function isInUsersHierarchy(folder: MediaFolder, currentUserDocumentId?: string | null): boolean {
  if (currentUserDocumentId && folder.ownerDocumentId === currentUserDocumentId) {
    return false;
  }
  // Vérifier par hierarchy
  if (folder.hierarchy && folder.hierarchy.length > 0) {
    return true;
  }

  return folder.name === 'users';
}

function isSystemFolder(folderName: string): boolean {
  return folderName === 'soncollab_admin' ||
    folderName === 'soncollab_content' ||
    folderName === 'users';
}

export function getBreadcrumbData(currentFolder: MediaFolder | null, currentUserDocumentId?: string | null): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ id: null, label: 'Media Library' }];

  if (!currentFolder) return breadcrumbs;

  const inUsersHierarchy = isInUsersHierarchy(currentFolder, currentUserDocumentId);

  // ========== DANS LA HIÉRARCHIE USERS ==========
  if (inUsersHierarchy) {
    if (!currentFolder.hierarchy || currentFolder.hierarchy.length === 0) {
      breadcrumbs.push({
        id: currentFolder.id,
        label: currentFolder.name === 'users' ? 'Users' : currentFolder.name,
        folder: currentFolder
      });
      return breadcrumbs;
    }

    const usersAncestor = currentFolder.hierarchy.find(h => h.name === 'users');

    if (usersAncestor) {
      breadcrumbs.push({
        id: usersAncestor.id,
        label: 'Users',
        folder: {
          id: usersAncestor.id,
          documentId: usersAncestor.documentId,
          name: usersAncestor.name,
          path: usersAncestor.path,
          pathId: usersAncestor.pathId,
          createdAt: '',
          updatedAt: ''
        } as MediaFolder
      });

      // Si le dossier courant est un dossier système, s'arrêter là
      if (isSystemFolder(currentFolder.name)) {
        return breadcrumbs;
      }

      // Construire tous les items (sans les dossiers système)
      const allItems: BreadcrumbItem[] = [];
      const hierarchyAfterUsers = currentFolder.hierarchy.filter(h => h.name !== 'users');

      for (const h of hierarchyAfterUsers) {
        // Skip les dossiers système
        if (isSystemFolder(h.name)) continue;

        // Si le dossier a userInfo, c'est le dossier utilisateur
        if (h.userInfo) {
          allItems.push({
            id: h.id,
            label: `${h.userInfo.firstName} ${h.userInfo.lastName}`,
            folder: {
              id: h.id,
              documentId: h.documentId,
              name: h.name,
              path: h.path,
              pathId: h.pathId,
              userInfo: h.userInfo,
              displayName: h.displayName,
              createdAt: '',
              updatedAt: ''
            } as MediaFolder
          });
        } else {
          // Dossier normal (comme "coco", "nova")
          allItems.push({
            id: h.id,
            label: h.name,
            folder: {
              id: h.id,
              documentId: h.documentId,
              name: h.name,
              path: h.path,
              pathId: h.pathId,
              createdAt: '',
              updatedAt: ''
            } as MediaFolder
          });
        }
      }

      // Si plus de 2 items APRÈS Users, utiliser ellipsis
      if (allItems.length > 2) {
        // Premier item (dossier utilisateur)
        breadcrumbs.push(allItems[0]);

        // Ellipsis avec les items du milieu
        breadcrumbs.push({
          id: -1,
          label: '...',
          isEllipsis: true,
          folder: undefined
        });

        // Dernier item (dossier courant)
        breadcrumbs.push(allItems[allItems.length - 1]);
      } else {
        // Afficher tous les items (2 ou moins)
        breadcrumbs.push(...allItems);
      }

      return breadcrumbs;
    }
  }

  // ========== HORS HIÉRARCHIE USERS ==========
  // Construire le chemin complet en remontant les parents
  const buildPath = (folder: MediaFolder): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    if (folder.parent) {
      // Ne pas remonter si le parent est un dossier utilisateur (avec userEmail ou userInfo)
      const parentIsUserFolder = folder.parent.userEmail || folder.parent.userInfo;

      if (!parentIsUserFolder && folder.parent.ownerDocumentId === currentUserDocumentId) {
        items.push(...buildPath(folder.parent));
      }
    }

    items.push({
      id: folder.id,
      label: folder.name,
      folder: folder
    });

    return items;
  };

  const fullPath = buildPath(currentFolder);

  // Si plus de 3 items, utiliser ellipsis
  if (fullPath.length > 3) {
    // Premier item
    breadcrumbs.push(fullPath[0]);

    // Ellipsis
    breadcrumbs.push({
      id: -1,
      label: '...',
      isEllipsis: true,
      folder: undefined
    });

    // Dernier item
    breadcrumbs.push(fullPath[fullPath.length - 1]);
  } else {
    // Afficher tous les items
    breadcrumbs.push(...fullPath);
  }

  return breadcrumbs;
}

// Fonction pour récupérer les items cachés dans l'ellipsis
export function getEllipsisItems(currentFolder: MediaFolder | null, currentUserDocumentId?: string | null): BreadcrumbItem[] {
  if (!currentFolder) return [];

  const inUsersHierarchy = isInUsersHierarchy(currentFolder, currentUserDocumentId);

  // ========== DANS USERS ==========
  if (inUsersHierarchy && currentFolder.hierarchy) {
    const hierarchyAfterUsers = currentFolder.hierarchy.filter(
      h => h.name !== 'users' && !isSystemFolder(h.name)
    );

    const items: BreadcrumbItem[] = [];

    for (let i = 1; i < hierarchyAfterUsers.length - 1; i++) {
      const h = hierarchyAfterUsers[i];

      if (h.userInfo) {
        items.push({
          id: h.id,
          label: `${h.userInfo.firstName} ${h.userInfo.lastName}`,
          folder: {
            id: h.id,
            documentId: h.documentId,
            name: h.name,
            path: h.path,
            pathId: h.pathId,
            userInfo: h.userInfo,
            displayName: h.displayName,
            createdAt: '',
            updatedAt: ''
          } as MediaFolder
        });
      } else {
        items.push({
          id: h.id,
          label: h.name,
          folder: {
            id: h.id,
            documentId: h.documentId,
            name: h.name,
            path: h.path,
            pathId: h.pathId,
            createdAt: '',
            updatedAt: ''
          } as MediaFolder
        });
      }
    }

    return items;
  }

  // ========== HORS USERS ==========
  const buildPath = (folder: MediaFolder): MediaFolder[] => {
    const items: MediaFolder[] = [];

    if (folder.parent) {
      // Ne pas remonter si le parent est un dossier utilisateur
      const parentIsUserFolder = folder.parent.userEmail || folder.parent.userInfo;

      if (!parentIsUserFolder && folder.parent.ownerDocumentId === currentUserDocumentId) {
        items.push(...buildPath(folder.parent));
      }
    }

    items.push(folder);
    return items;
  };

  const fullPath = buildPath(currentFolder);

  // Retourner les items du milieu (sauf le premier et le dernier)
  return fullPath.slice(1, -1).map(f => ({
    id: f.id,
    label: f.name,
    folder: f
  }));
}
