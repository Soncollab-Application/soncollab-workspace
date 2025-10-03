export interface AccordionItem {
  id: string;
  title: string;
  content: string;
  icon?: string;
  expanded?: boolean;
}

export type AccordionIconStyle = 'default' | 'alt';
