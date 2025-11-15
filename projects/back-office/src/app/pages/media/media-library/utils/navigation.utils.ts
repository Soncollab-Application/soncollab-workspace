export interface FolderNavigationParams {
  folder?: string;
  folderPath?: string;
}

export function getFolderURL(
  baseUrl: string,
  currentQuery: any,
  folderParams?: FolderNavigationParams
): string {
  const query = { ...currentQuery };

  if (folderParams) {
    query.folder = folderParams.folder;
    query.folderPath = folderParams.folderPath;
  } else {
    delete query.folder;
    delete query.folderPath;
  }

  query.page = 1;

  const queryString = new URLSearchParams(query).toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function containsAssetFilter(query: any): boolean {
  if (!query) return false;

  if (query._q) return true;

  if (query.filters?.$and && Array.isArray(query.filters.$and)) {
    return query.filters.$and.some((filter: any) => {
      const keys = Object.keys(filter);
      return keys.some(key => key !== 'folderPath');
    });
  }

  return false;
}
