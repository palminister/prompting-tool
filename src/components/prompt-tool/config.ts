import type { JSONContent } from '@tiptap/core';
import {
  Blocks,
  Braces,
  Database,
  FolderTree,
  Hammer,
  Search,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

import type { GroupColor, IconName, PromptToolState } from '@/components/prompt-tool/types';

export const STORAGE_KEY = 'prompt-tool-state-v1';

export const GROUP_COLORS: GroupColor[] = [
  { name: 'Blue', value: '#DFE5FF', textColor: '#4A5A8A' },
  { name: 'Pink', value: '#EFD6E7', textColor: '#8A5573' },
  { name: 'Peach', value: '#F4D2BB', textColor: '#8A5A3E' },
  { name: 'Green', value: '#D4EAD9', textColor: '#4F7A5D' },
  { name: 'Yellow', value: '#EFE08F', textColor: '#7A6A24' },
  { name: 'Purple', value: '#E6D8F3', textColor: '#6D4F8A' },
  { name: 'Gray', value: '#EDEDED', textColor: '#6B6B6B' },
];

export const ICON_MAP: Record<IconName, LucideIcon> = {
  Braces,
  Search,
  Hammer,
  FolderTree,
  Sparkles,
  Blocks,
  Database,
  WandSparkles,
};

export const EMPTY_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

export function createDefaultState(createId: (prefix: string) => string): PromptToolState {
  return {
    activeView: 'data-map',
    activeSourceId: null,
    documentTitle: 'Prompt',
    editorContent: EMPTY_DOCUMENT,
    groups: [
      {
        id: createId('group'),
        name: 'Core variables',
        prefix: '',
        color: GROUP_COLORS[0].value,
        textColor: GROUP_COLORS[0].textColor,
        icon: 'Braces',
        variables: [],
      },
    ],
    sources: [],
  };
}
