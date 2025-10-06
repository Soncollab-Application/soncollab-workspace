export interface User {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function getUserInitials(user: User | null | undefined): string {
  if (!user) return 'U';

  const first = user.first_name?.charAt(0) || '';
  const last = user.last_name?.charAt(0) || '';
  return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
}

export function getUserFullName(user: User | null | undefined): string {
  if (!user) return '';

  const first = user.first_name || '';
  const last = user.last_name || '';
  return `${first} ${last}`.trim() || user.email || '';
}


export function getInitialsByParamsName(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
