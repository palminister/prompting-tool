import type { JSONContent } from '@tiptap/core';
import type { useEditor } from '@tiptap/react';

import type {
  VariableParameterDefinition,
  VariableParameterReference,
  VariableParameterValues,
} from '@/components/editor/variable-pill-extension';
import {
  EMPTY_DOCUMENT,
  createDefaultState,
} from '@/components/prompt-tool/config';
import type {
  EditorJsonNode,
  GroupRecord,
  IconName,
  JsonValue,
  PromptToolState,
  VariableRecord,
  VariableReference,
} from '@/components/prompt-tool/types';

export function serializeEditorMarkdown(doc: EditorJsonNode): string {
  return `${serializeBlockNode(doc).trimEnd()}\n`;
}

function serializeBlockNode(node: EditorJsonNode, depth = 0): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? [])
        .map((child) => serializeBlockNode(child, depth))
        .join('');
    case 'paragraph': {
      const content = serializeInlineNodes(node.content ?? []);
      return content ? `${content}\n\n` : '\n';
    }
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      return `${'#'.repeat(level)} ${serializeInlineNodes(node.content ?? [])}\n\n`;
    }
    case 'bulletList':
      return `${serializeList(node, depth, false)}\n`;
    case 'orderedList':
      return `${serializeList(node, depth, true, Number(node.attrs?.start ?? 1))}\n`;
    case 'blockquote': {
      const inner = (node.content ?? [])
        .map((child) => serializeBlockNode(child, depth))
        .join('')
        .trimEnd();
      return (
        inner
          .split('\n')
          .map((line) => (line ? `> ${line}` : '>'))
          .join('\n') + '\n\n'
      );
    }
    case 'codeBlock': {
      const language = String(node.attrs?.language ?? '');
      const text = (node.content ?? []).map((child) => child.text ?? '').join('');
      return `\`\`\`${language}\n${text}\n\`\`\`\n\n`;
    }
    default:
      return (node.content ?? [])
        .map((child) => serializeBlockNode(child, depth))
        .join('');
  }
}

function serializeList(
  node: EditorJsonNode,
  depth: number,
  ordered: boolean,
  start = 1,
): string {
  return (node.content ?? [])
    .map((child, index) =>
      serializeListItem(child, depth, ordered ? `${start + index}.` : '-'),
    )
    .join('');
}

function serializeListItem(
  node: EditorJsonNode,
  depth: number,
  marker: string,
): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  let leadWritten = false;

  (node.content ?? []).forEach((child) => {
    if (child.type === 'paragraph') {
      const text = serializeInlineNodes(child.content ?? []);
      if (!leadWritten) {
        lines.push(`${indent}${marker} ${text}`);
        leadWritten = true;
      } else {
        lines.push(`${indent}  ${text}`);
      }
      return;
    }

    if (child.type === 'bulletList') {
      lines.push(serializeList(child, depth + 1, false).trimEnd());
      return;
    }

    if (child.type === 'orderedList') {
      lines.push(
        serializeList(child, depth + 1, true, Number(child.attrs?.start ?? 1)).trimEnd(),
      );
      return;
    }

    const fallback = serializeBlockNode(child, depth + 1).trimEnd();

    if (!fallback) {
      return;
    }

    if (!leadWritten) {
      lines.push(`${indent}${marker} ${fallback}`);
      leadWritten = true;
      return;
    }

    lines.push(`${indent}  ${fallback}`);
  });

  if (!lines.length) {
    lines.push(`${indent}${marker}`);
  }

  return `${lines.join('\n')}\n`;
}

function serializeInlineNodes(nodes: EditorJsonNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return applyMarks(node.text ?? '', node.marks ?? []);
      }

      if (node.type === 'hardBreak') {
        return '  \n';
      }

      if (node.type === 'variablePill') {
        return serializeVariablePillMarkdown(node.attrs ?? {});
      }

      return serializeInlineNodes(node.content ?? []);
    })
    .join('');
}

function applyMarks(text: string, marks: Array<{ type: string }>) {
  return marks.reduce((content, mark) => {
    if (mark.type === 'bold') {
      return `**${content}**`;
    }

    if (mark.type === 'italic') {
      return `*${content}*`;
    }

    if (mark.type === 'code') {
      return `\`${content}\``;
    }

    return content;
  }, escapeMarkdown(text));
}

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_{}\[\]()#+\-.!])/g, '\\$1');
}

function serializeVariablePillMarkdown(attrs: Record<string, unknown>) {
  const displayName = String(attrs.displayName ?? '');
  const parameters =
    (attrs.parameters as VariableParameterDefinition[] | undefined) ?? [];
  const parameterValues =
    (attrs.parameterValues as VariableParameterValues | undefined) ?? {};

  return `\`${formatVariableInvocationMarkdown(
    displayName,
    parameters,
    parameterValues,
  )}\``;
}

export function collectVariableReferences(
  editor: NonNullable<ReturnType<typeof useEditor>>,
): Record<string, VariableReference[]> {
  const references: Record<string, VariableReference[]> = {};
  let order = 0;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'variablePill') {
      return true;
    }

    order += 1;
    const attrs = node.attrs as Record<string, unknown>;
    const variableId = String(attrs.variableId ?? '');

    if (!variableId) {
      return true;
    }

    if (!references[variableId]) {
      references[variableId] = [];
    }

    references[variableId].push({
      displayName: String(attrs.displayName ?? ''),
      order,
      pos,
      variableId,
    });

    return true;
  });

  return references;
}

export function syncEditorVariablePills(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  groups: GroupRecord[],
) {
  let transaction = editor.state.tr;
  let hasChanges = false;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'variablePill') {
      return true;
    }

    const attrs = node.attrs as Record<string, unknown>;
    const variableId = String(attrs.variableId ?? '');
    const match = findGroupVariableById(groups, variableId);

    if (!match) {
      return true;
    }

    const nextAttrs = {
      ...attrs,
      description: match.variable.description,
      displayName: getGroupVariableName(match.group, match.variable),
      groupColor: match.group.color,
      groupIcon: match.group.icon,
      groupTextColor: match.group.textColor,
      parameterValues: syncParameterValues(
        (attrs.parameterValues as VariableParameterValues | undefined) ?? {},
        groups,
      ),
      parameters: getVariableParameters(match.variable),
      tooltip: match.variable.tooltip,
    };

    if (JSON.stringify(attrs) === JSON.stringify(nextAttrs)) {
      return true;
    }

    transaction = transaction.setNodeMarkup(pos, undefined, nextAttrs);
    hasChanges = true;
    return true;
  });

  if (hasChanges) {
    editor.view.dispatch(transaction);
  }
}

export function removeVariablePillsFromContent(
  content: JSONContent | null,
  variableIds: string[],
) {
  if (!content || !variableIds.length) {
    return content ?? EMPTY_DOCUMENT;
  }

  const variableIdSet = new Set(variableIds);
  const nextContent = pruneVariablePills(content, variableIdSet);

  if (!nextContent?.content?.length) {
    return EMPTY_DOCUMENT;
  }

  return nextContent;
}

function pruneVariablePills(
  node: JSONContent,
  variableIds: Set<string>,
): JSONContent | null {
  if (
    node.type === 'variablePill' &&
    variableIds.has(String(node.attrs?.variableId ?? ''))
  ) {
    return null;
  }

  const nextChildren = node.content
    ?.map((child) => pruneVariablePills(child, variableIds))
    .filter((child): child is JSONContent => child !== null);

  if (!nextChildren) {
    return node;
  }

  return {
    ...node,
    content: nextChildren,
  };
}

export function formatVariableInvocationMarkdown(
  displayName: string,
  parameters: VariableParameterDefinition[],
  parameterValues: VariableParameterValues,
) {
  if (!parameters.length) {
    return displayName;
  }

  const serializedParameters = parameters
    .map((parameter) => {
      const rawValue = parameterValues[parameter.key];

      if (isVariableParameterReference(rawValue)) {
        return `${parameter.key}=${rawValue.displayName}`;
      }

      if (typeof rawValue === 'boolean') {
        return rawValue ? `${parameter.key}=true` : parameter.required ? parameter.key : '';
      }

      const normalized = String(rawValue ?? '').trim();

      if (!normalized) {
        return parameter.required ? parameter.key : '';
      }

      return parameter.type === 'number'
        ? `${parameter.key}=${normalized}`
        : `${parameter.key}="${normalized.replace(/"/g, '\\"')}"`;
    })
    .filter(Boolean);

  return serializedParameters.length
    ? `${displayName}(${serializedParameters.join(', ')})`
    : displayName;
}

export function extractParameterDefinitions(
  item: Record<string, JsonValue>,
): VariableParameterDefinition[] {
  const parameterValue = item.parameters;

  if (!isPlainObject(parameterValue)) {
    return [];
  }

  return Object.entries(parameterValue)
    .filter(([, definition]) => isPlainObject(definition))
    .map(([key, definition]) => {
      const schema = definition as Record<string, JsonValue>;

      return {
        key,
        type: String(schema.type ?? 'string'),
        required: Boolean(schema.required),
        description: String(schema.description ?? ''),
      };
    });
}

export function renderJsonPrimitive(value: JsonValue) {
  if (typeof value === 'string') {
    return <span className='text-emerald-300'>&quot;{value}&quot;</span>;
  }

  if (typeof value === 'number') {
    return <span className='text-amber-300'>{value}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className='text-fuchsia-300'>{String(value)}</span>;
  }

  return <span className='text-slate-500'>null</span>;
}

export function displayPathSegment(path: string) {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizePromptToolState(parsed: PromptToolState): PromptToolState {
  const defaultState = createDefaultState(createId);
  const groups = parsed.groups?.length
    ? parsed.groups.map((group) => ({
        ...group,
        prefix: String(group.prefix ?? ''),
        variables: (group.variables ?? []).map((variable) => ({
          ...variable,
          parameters: getVariableParameters(variable),
        })),
      }))
    : defaultState.groups;
  const legacyStarterTexts = new Set([
    'Write your build plan here. Type / to insert a mapped variable.',
    'Start writing here. Type / to insert a mapped variable.',
    'Write your prompt here...',
  ]);
  const legacyEditorText =
    parsed.editorContent?.type === 'doc' &&
    parsed.editorContent.content?.length === 1 &&
    parsed.editorContent.content[0]?.type === 'paragraph' &&
    parsed.editorContent.content[0]?.content?.length === 1 &&
    parsed.editorContent.content[0]?.content?.[0]?.type === 'text' &&
    typeof parsed.editorContent.content[0]?.content?.[0]?.text === 'string'
      ? parsed.editorContent.content[0]?.content?.[0]?.text
      : null;
  const hasLegacyStarterText =
    legacyEditorText !== null && legacyStarterTexts.has(legacyEditorText);

  return {
    ...defaultState,
    ...parsed,
    activeSourceId: parsed.activeSourceId ?? parsed.sources?.[0]?.id ?? null,
    editorContent:
      !parsed.editorContent || hasLegacyStarterText
        ? EMPTY_DOCUMENT
        : parsed.editorContent,
    groups,
    sources: parsed.sources ?? [],
  };
}

export function getVariableParameters(
  variable: Partial<VariableRecord>,
): VariableParameterDefinition[] {
  return Array.isArray(variable.parameters) ? variable.parameters : [];
}

export function findGroupVariableById(groups: GroupRecord[], variableId: string) {
  for (const group of groups) {
    const variable = group.variables.find((entry) => entry.id === variableId);

    if (variable) {
      return { group, variable };
    }
  }

  return null;
}

function isVariableParameterReference(
  value: unknown,
): value is VariableParameterReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VariableParameterReference).type === 'variable' &&
    typeof (value as VariableParameterReference).displayName === 'string' &&
    typeof (value as VariableParameterReference).variableId === 'string'
  );
}

function syncParameterValues(
  parameterValues: VariableParameterValues,
  groups: GroupRecord[],
) {
  const nextValues: VariableParameterValues = { ...parameterValues };

  Object.entries(parameterValues).forEach(([key, value]) => {
    if (!isVariableParameterReference(value)) {
      return;
    }

    const match = findGroupVariableById(groups, value.variableId);

    if (!match) {
      return;
    }

    nextValues[key] = {
      ...value,
      displayName: getGroupVariableName(match.group, match.variable),
    };
  });

  return nextValues;
}

export function getGroupVariableName(
  group: Pick<GroupRecord, 'prefix'>,
  variable: Pick<VariableRecord, 'displayName'>,
) {
  return `${group.prefix ?? ''}${variable.displayName}`;
}

export function isPlainObject(
  value: JsonValue,
): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function iconGlyph(icon: IconName) {
  const glyphs: Record<IconName, string> = {
    Braces: '{}',
    Search: 'SR',
    Hammer: 'BL',
    FolderTree: 'TR',
    Sparkles: 'FX',
    Blocks: 'BK',
    Database: 'DB',
    WandSparkles: 'AI',
  };

  return glyphs[icon];
}
