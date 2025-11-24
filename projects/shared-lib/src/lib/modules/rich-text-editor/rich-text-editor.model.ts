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
