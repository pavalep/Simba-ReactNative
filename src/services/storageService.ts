export type ThemeMode = 'light' | 'dark' | 'system';

const storage: Record<string, never> = {};

export {storage};

export function setThemePreference(_mode: ThemeMode): void {
  // TODO: Persist theme preference
}

export function getThemePreference(): ThemeMode {
  // TODO: Load persisted theme preference
  return 'system';
}

export function setRecentSearches(_searches: string[]): void {
  // TODO: Persist recent searches
}

export function getRecentSearches(): string[] {
  // TODO: Load persisted recent searches
  return [];
}

export function setLinkedFolders(_type: 'video' | 'audio', _folders: string[]): void {
  // TODO: Persist linked folders
}

export function getLinkedFolders(_type: 'video' | 'audio'): string[] {
  // TODO: Return actual linked folders from storage
  return [];
}
