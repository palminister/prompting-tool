'use client';

import { NodeSelection } from '@tiptap/pm/state';
import { Placeholder } from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/react';
import {
  DragOverlay,
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Layers3, PencilLine } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  createVariablePillExtension,
  type VariableSuggestionItem,
} from '@/components/editor/variable-pill-extension';
import {
  EMPTY_DOCUMENT,
  GROUP_COLORS,
  STORAGE_KEY,
  createDefaultState,
} from '@/components/prompt-tool/config';
import { DataMappingView } from '@/components/prompt-tool/data-mapping-view';
import { PromptEditorView } from '@/components/prompt-tool/prompt-editor-view';
import { SidebarButton } from '@/components/prompt-tool/shared';
import type {
  DragItem,
  EditorJsonNode,
  GroupDraft,
  GroupRecord,
  JsonValue,
  PromptToolState,
  SourceDraft,
  SourceRecord,
  VariableReference,
} from '@/components/prompt-tool/types';
import {
  collectVariableReferences,
  createId,
  getGroupVariableName,
  getVariableParameters,
  normalizePromptToolState,
  removeVariablePillsFromContent,
  serializeEditorMarkdown,
  slugify,
  syncEditorVariablePills,
} from '@/components/prompt-tool/utils';

let liveVariableSuggestions: VariableSuggestionItem[] = [];

const DEFAULT_GROUP_DRAFT: GroupDraft = {
  name: '',
  colorIndex: 1,
  icon: 'Search',
};

const DEFAULT_SOURCE_DRAFT: SourceDraft = {
  label: '',
  rawJson: '',
};

export function PromptToolApp() {
  const [state, setState] = useState<PromptToolState>(() =>
    createDefaultState(createId),
  );
  const [activeEditorGroupIds, setActiveEditorGroupIds] = useState<string[]>(
    [],
  );
  const [hydrated, setHydrated] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [sourceDraft, setSourceDraft] =
    useState<SourceDraft>(DEFAULT_SOURCE_DRAFT);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(DEFAULT_GROUP_DRAFT);
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [duplicateVariableId, setDuplicateVariableId] = useState<string | null>(
    null,
  );
  const [openReferenceVariableId, setOpenReferenceVariableId] = useState<
    string | null
  >(null);
  const duplicateResetTimeoutRef = useRef<number | null>(null);
  const storageSaveTimeoutRef = useRef<number | null>(null);
  const suppressEditorSaveRef = useRef(false);
  const [variableExtension] = useState(() =>
    createVariablePillExtension(() => liveVariableSuggestions),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      if (stored) {
        try {
          setState(
            normalizePromptToolState(JSON.parse(stored) as PromptToolState),
          );
        } catch {
          setState(createDefaultState(createId));
        }
      }

      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (storageSaveTimeoutRef.current !== null) {
      window.clearTimeout(storageSaveTimeoutRef.current);
    }

    storageSaveTimeoutRef.current = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageSaveTimeoutRef.current = null;
    }, 180);

    return () => {
      if (storageSaveTimeoutRef.current !== null) {
        window.clearTimeout(storageSaveTimeoutRef.current);
      }
    };
  }, [hydrated, state]);

  const allVariables = useMemo(
    () =>
      state.groups.flatMap((group) =>
        group.variables.map((variable) => ({
          variableId: variable.id,
          displayName: getGroupVariableName(group, variable),
          description: variable.description,
          tooltip: variable.tooltip,
          groupId: group.id,
          groupName: group.name,
          groupColor: group.color,
          groupTextColor: group.textColor,
          groupIcon: group.icon,
          parameters: getVariableParameters(variable),
        })),
      ),
    [state.groups],
  );
  const mappedItemIds = useMemo(
    () =>
      new Set(
        state.groups.flatMap((group) =>
          group.variables.map((variable) => variable.id),
        ),
      ),
    [state.groups],
  );

  useEffect(() => {
    liveVariableSuggestions = allVariables;
  }, [allVariables]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your prompt here...',
      }),
      variableExtension,
    ],
    content: state.editorContent ?? EMPTY_DOCUMENT,
    editorProps: {
      attributes: {
        class: 'prompt-editor min-h-[60vh] focus:outline-none',
      },
      handleClickOn() {
        return false;
      },
    },
    onUpdate({ editor: currentEditor }) {
      if (suppressEditorSaveRef.current) {
        return;
      }

      setState((current) => ({
        ...current,
        editorContent: currentEditor.getJSON(),
      }));
    },
  });

  useEffect(() => {
    if (editor) {
      syncEditorVariablePills(editor, state.groups);
    }
  }, [editor, state.groups]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = state.editorContent ?? EMPTY_DOCUMENT;

    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(nextContent)) {
      suppressEditorSaveRef.current = true;
      editor.commands.setContent(nextContent);
      window.requestAnimationFrame(() => {
        suppressEditorSaveRef.current = false;
      });
    }
  }, [editor, state.editorContent]);

  useEffect(
    () => () => {
      if (duplicateResetTimeoutRef.current !== null) {
        window.clearTimeout(duplicateResetTimeoutRef.current);
      }
      if (storageSaveTimeoutRef.current !== null) {
        window.clearTimeout(storageSaveTimeoutRef.current);
      }
    },
    [],
  );

  const updateGroups = (updater: (groups: GroupRecord[]) => GroupRecord[]) => {
    setState((current) => ({
      ...current,
      groups: updater(current.groups),
    }));
  };

  const handleParseSource = () => {
    if (!sourceDraft.rawJson.trim()) {
      setSourceError('Paste a JSON payload before parsing.');
      return;
    }

    try {
      const parsed = JSON.parse(sourceDraft.rawJson) as JsonValue;
      const source: SourceRecord = {
        id: createId('source'),
        label: sourceDraft.label.trim() || `Source ${state.sources.length + 1}`,
        rawJson: sourceDraft.rawJson,
        data: parsed,
      };

      setState((current) => ({
        ...current,
        activeSourceId: source.id,
        sources: [...current.sources, source],
      }));
      setSourceDraft(DEFAULT_SOURCE_DRAFT);
      setSourceError(null);
      setShowSourceForm(false);
      toast.success('JSON source added. Next: inspect the payload below.');
    } catch {
      setSourceError('That payload is not valid JSON.');
    }
  };

  const handleCreateGroup = () => {
    const selectedColor =
      GROUP_COLORS[groupDraft.colorIndex] ?? GROUP_COLORS[0];

    updateGroups((groups) => [
      ...groups,
      {
        id: createId('group'),
        name: groupDraft.name.trim() || `Group ${groups.length + 1}`,
        prefix: '',
        color: selectedColor.value,
        textColor: selectedColor.textColor,
        icon: groupDraft.icon,
        variables: [],
      },
    ]);
    setGroupDraft(DEFAULT_GROUP_DRAFT);
    setShowGroupForm(false);
    toast.success('Variable group created. Next: drag fields into it.');
  };

  const handleCancelGroupCreate = () => {
    setGroupDraft(DEFAULT_GROUP_DRAFT);
    setShowGroupForm(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current?.item as DragItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const dragItem = event.active.data.current?.item as DragItem | undefined;
    setActiveDragItem(null);

    if (!dragItem || typeof event.over?.id !== 'string') {
      return;
    }

    const overId = event.over.id;
    if (!overId.startsWith('group-drop-')) {
      return;
    }

    const targetGroupId = overId.replace('group-drop-', '');
    let duplicateId: string | null = null;
    let mappedVariable = false;

    updateGroups((groups) =>
      groups.map((group) => {
        if (group.id !== targetGroupId) {
          return group;
        }

        const variableId = `${dragItem.sourceId}:${dragItem.keyPath}:${dragItem.itemIndex}`;
        const alreadyExists = group.variables.find(
          (variable) => variable.id === variableId,
        );

        if (alreadyExists) {
          duplicateId = alreadyExists.id;
          return group;
        }

        mappedVariable = true;

        return {
          ...group,
          variables: [
            ...group.variables,
            {
              id: variableId,
              sourceId: dragItem.sourceId,
              displayName: dragItem.name,
              description: dragItem.description,
              keyPath: dragItem.keyPath,
              itemIndex: dragItem.itemIndex,
              tooltip: `${dragItem.sourceLabel}: ${dragItem.keyPath}[${dragItem.itemIndex}].name`,
              parameters: dragItem.parameters,
            },
          ],
        };
      }),
    );

    if (duplicateId) {
      setDuplicateVariableId(duplicateId);

      if (duplicateResetTimeoutRef.current !== null) {
        window.clearTimeout(duplicateResetTimeoutRef.current);
      }

      duplicateResetTimeoutRef.current = window.setTimeout(() => {
        setDuplicateVariableId(null);
        duplicateResetTimeoutRef.current = null;
      }, 420);

      queueMicrotask(() => toast('This variable is already in that group.'));
      return;
    }

    if (mappedVariable) {
      queueMicrotask(() =>
        toast.success('Variable mapped. Next: insert it from the editor rail.'),
      );
    }
  };

  const handleCopyMarkdown = async () => {
    const markdown = serializeEditorMarkdown(
      (editor?.getJSON() ??
        state.editorContent ??
        EMPTY_DOCUMENT) as EditorJsonNode,
    );

    await navigator.clipboard.writeText(markdown);
    toast.success('Copied markdown');
  };

  const handleDownloadMarkdown = () => {
    const markdown = serializeEditorMarkdown(
      (editor?.getJSON() ??
        state.editorContent ??
        EMPTY_DOCUMENT) as EditorJsonNode,
    );
    const filename = `${slugify(state.documentTitle || 'build-plan')}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown downloaded');
  };

  const variableUsageMap = editor ? collectVariableReferences(editor) : {};
  const visibleEditorGroups = useMemo(
    () =>
      activeEditorGroupIds.length
        ? state.groups.filter((group) =>
            activeEditorGroupIds.includes(group.id),
          )
        : state.groups,
    [activeEditorGroupIds, state.groups],
  );

  const jumpToReference = (reference: VariableReference) => {
    if (!editor) {
      return;
    }

    editor.view.dispatch(
      editor.state.tr
        .setSelection(NodeSelection.create(editor.state.doc, reference.pos))
        .scrollIntoView(),
    );
    editor.commands.focus();
  };

  const removeVariableFromGroup = (groupId: string, variableId: string) => {
    setOpenReferenceVariableId((current) =>
      current === variableId ? null : current,
    );
    setState((current) => ({
      ...current,
      editorContent: removeVariablePillsFromContent(current.editorContent, [
        variableId,
      ]),
      groups: current.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              variables: group.variables.filter(
                (variable) => variable.id !== variableId,
              ),
            }
          : group,
      ),
    }));
    toast.success('Variable deleted from the group.');
  };

  const deleteGroup = (group: GroupRecord) => {
    const deletedVariableIds = group.variables.map((variable) => variable.id);

    setActiveEditorGroupIds((current) =>
      current.filter((id) => id !== group.id),
    );
    setOpenReferenceVariableId((current) =>
      current && deletedVariableIds.includes(current) ? null : current,
    );
    setState((current) => ({
      ...current,
      editorContent: removeVariablePillsFromContent(
        current.editorContent,
        deletedVariableIds,
      ),
      groups: current.groups.filter((entry) => entry.id !== group.id),
    }));
    toast.success('Variable group deleted.');
  };

  if (!hydrated) {
    return (
      <div className='workspace-shell flex min-h-screen items-center justify-center text-foreground'>
        <div className='type-body-muted rounded-full border border-border bg-card px-4 py-2 text-muted-foreground'>
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className='workspace-shell min-h-screen text-foreground'>
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className='mx-auto flex min-h-screen w-full max-w-[1600px] flex-col md:flex-row'>
          <aside className='workspace-sidebar border-b border-border px-4 py-5 md:min-h-screen md:w-[var(--sidebar-width)] md:border-r md:border-b-0 md:px-4 md:py-6'>
            <div className='stack-section'>
              <div className='stack-tight border-b border-border/80 pb-4'>
                <h1 className='type-page-title text-foreground'>
                  Prompting Tool
                </h1>
              </div>

              <div className='space-y-2'>
                <SidebarButton
                  active={state.activeView === 'data-map'}
                  icon={Layers3}
                  label='Data Mapping'
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      activeView: 'data-map',
                    }))
                  }
                />
                <SidebarButton
                  active={state.activeView === 'editor'}
                  icon={PencilLine}
                  label='Prompt Editor'
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      activeView: 'editor',
                    }))
                  }
                />
              </div>
            </div>
          </aside>

          <main className='flex-1 px-3 py-3 md:px-6 md:py-6 lg:px-7 lg:py-7'>
            {state.activeView === 'data-map' ? (
              <DataMappingView
                activeSourceId={state.activeSourceId}
                duplicateVariableId={duplicateVariableId}
                groupDraft={groupDraft}
                groups={state.groups}
                mappedItemIds={mappedItemIds}
                onActiveSourceChange={(value) =>
                  setState((current) => ({ ...current, activeSourceId: value }))
                }
                onAddCustomVariable={(groupId, variable) =>
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId
                        ? {
                            ...group,
                            variables: [
                              ...group.variables,
                              {
                                id: createId('custom-variable'),
                                sourceId: 'custom',
                                displayName: variable.displayName,
                                description: variable.description,
                                keyPath: 'custom',
                                itemIndex: group.variables.length,
                                tooltip: `Custom variable: ${variable.displayName}`,
                                parameters: variable.parameters,
                              },
                            ],
                          }
                        : group,
                    ),
                  )
                }
                onCreateGroup={handleCreateGroup}
                onDeleteGroup={deleteGroup}
                onGroupColorChange={(groupId, colorIndex) => {
                  const selectedColor =
                    GROUP_COLORS[colorIndex] ?? GROUP_COLORS[0];
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId
                        ? {
                            ...group,
                            color: selectedColor.value,
                            textColor: selectedColor.textColor,
                          }
                        : group,
                    ),
                  );
                }}
                onGroupDraftChange={setGroupDraft}
                onGroupIconChange={(groupId, icon) =>
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId ? { ...group, icon } : group,
                    ),
                  )
                }
                onGroupNameChange={(groupId, name) =>
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId ? { ...group, name } : group,
                    ),
                  )
                }
                onGroupPrefixChange={(groupId, prefix) =>
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId ? { ...group, prefix } : group,
                    ),
                  )
                }
                onParseSource={handleParseSource}
                onRemoveVariable={removeVariableFromGroup}
                onSourceDraftChange={(draft) => {
                  setSourceDraft(draft);
                  if (sourceError) {
                    setSourceError(null);
                  }
                }}
                onToggleGroupCreate={handleCancelGroupCreate}
                onToggleGroupForm={() =>
                  setShowGroupForm((current) => !current)
                }
                onToggleSourceForm={() =>
                  setShowSourceForm((current) => !current)
                }
                onUpdateCustomVariable={(groupId, variableId, variable) =>
                  updateGroups((groups) =>
                    groups.map((group) =>
                      group.id === groupId
                        ? {
                            ...group,
                            variables: group.variables.map((item) =>
                              item.id === variableId
                                ? {
                                    ...item,
                                    displayName: variable.displayName,
                                    description: variable.description,
                                    parameters: variable.parameters,
                                    tooltip: `Custom variable: ${variable.displayName}`,
                                  }
                                : item,
                            ),
                          }
                        : group,
                    ),
                  )
                }
                showGroupForm={showGroupForm}
                showSourceForm={showSourceForm}
                sourceDraft={sourceDraft}
                sourceError={sourceError}
                sources={state.sources}
              />
            ) : (
              <PromptEditorView
                activeEditorGroupIds={activeEditorGroupIds}
                editor={editor}
                groups={state.groups}
                onCopyMarkdown={handleCopyMarkdown}
                onDownloadMarkdown={handleDownloadMarkdown}
                onJumpToReference={jumpToReference}
                onToggleGroup={(groupId) =>
                  setActiveEditorGroupIds((current) =>
                    current.includes(groupId)
                      ? current.filter((id) => id !== groupId)
                      : [...current, groupId],
                  )
                }
                onToggleReferenceOpen={(variableId) =>
                  setOpenReferenceVariableId((current) =>
                    current === variableId ? null : variableId,
                  )
                }
                openReferenceVariableId={openReferenceVariableId}
                variableUsageMap={variableUsageMap}
                visibleGroups={visibleEditorGroups}
              />
            )}
          </main>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className='workspace-drag-overlay min-w-[16rem] rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-left text-foreground shadow-[var(--shadow-soft)]'>
              <div className='type-kicker text-muted-foreground'>
                {activeDragItem.sourceLabel}
              </div>
              <div className='type-ui-strong mt-1 [overflow-wrap:anywhere]'>
                {activeDragItem.name}
              </div>
              {activeDragItem.description ? (
                <div className='type-caption mt-1 text-muted-foreground [overflow-wrap:anywhere]'>
                  {activeDragItem.description}
                </div>
              ) : null}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
