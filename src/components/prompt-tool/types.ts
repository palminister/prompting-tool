import type { JSONContent } from '@tiptap/core';

import type {
  VariableParameterDefinition,
  VariableParameterReference,
} from '@/components/editor/variable-pill-extension';

export type AppView = 'data-map' | 'editor';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type IconName =
  | 'Braces'
  | 'Search'
  | 'Hammer'
  | 'FolderTree'
  | 'Sparkles'
  | 'Blocks'
  | 'Database'
  | 'WandSparkles';

export type GroupColor = {
  name: string;
  value: string;
  textColor: string;
};

export type SourceRecord = {
  id: string;
  label: string;
  rawJson: string;
  data: JsonValue;
};

export type VariableRecord = {
  id: string;
  sourceId: string;
  displayName: string;
  description: string;
  keyPath: string;
  itemIndex: number;
  tooltip: string;
  parameters: VariableParameterDefinition[];
};

export type GroupRecord = {
  id: string;
  name: string;
  prefix: string;
  color: string;
  textColor: string;
  icon: IconName;
  variables: VariableRecord[];
};

export type PromptToolState = {
  activeView: AppView;
  activeSourceId: string | null;
  documentTitle: string;
  editorContent: JSONContent | null;
  groups: GroupRecord[];
  sources: SourceRecord[];
};

export type DragItem = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  keyPath: string;
  itemIndex: number;
  name: string;
  description: string;
  parameters: VariableParameterDefinition[];
};

export type VariableReference = {
  displayName: string;
  order: number;
  pos: number;
  variableId: string;
};

export type EditorJsonNode = {
  attrs?: Record<string, unknown>;
  content?: EditorJsonNode[];
  marks?: Array<{ type: string }>;
  text?: string;
  type: string;
};

export type GroupDraft = {
  name: string;
  colorIndex: number;
  icon: IconName;
};

export type SourceDraft = {
  label: string;
  rawJson: string;
};

export type VariableParameterReferenceValue = VariableParameterReference;
