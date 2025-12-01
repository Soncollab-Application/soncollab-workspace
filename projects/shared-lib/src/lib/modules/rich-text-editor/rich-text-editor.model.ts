export type EditorMode = 'wysiwyg' | 'markdown';

export interface EditorState {
  content: string;
  mode: EditorMode;
  isDirty: boolean;
}

export interface EditorCommand {
  name: string;
  icon: string;
  label: string;
  action: () => void;
  isActive?: () => boolean;
}

export interface ImageResult {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface MediaResult {
  url: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
  mime: string;
  size?: number;
  alt?: string;
  width?: number;
  height?: number;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'all';
