import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, FileDown, Braces } from 'lucide-react';

import { ICON_MAP } from '@/components/prompt-tool/config';
import { EmptyPanel } from '@/components/prompt-tool/shared';
import type {
  GroupRecord,
  VariableReference,
} from '@/components/prompt-tool/types';
import {
  getGroupVariableName,
  getVariableParameters,
} from '@/components/prompt-tool/utils';
import { cn } from '@/lib/utils';

export function PromptEditorView({
  activeEditorGroupIds,
  editor,
  groups,
  onCopyMarkdown,
  onDownloadMarkdown,
  onJumpToReference,
  onToggleGroup,
  onToggleReferenceOpen,
  openReferenceVariableId,
  variableUsageMap,
  visibleGroups,
}: {
  activeEditorGroupIds: string[];
  editor: Editor | null;
  groups: GroupRecord[];
  onCopyMarkdown: () => void;
  onDownloadMarkdown: () => void;
  onJumpToReference: (reference: VariableReference) => void;
  onToggleGroup: (groupId: string) => void;
  onToggleReferenceOpen: (variableId: string) => void;
  openReferenceVariableId: string | null;
  variableUsageMap: Record<string, VariableReference[]>;
  visibleGroups: GroupRecord[];
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className='workspace-panel min-h-[calc(100vh-3rem)] overflow-hidden'
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <div className='workspace-section workspace-divider-soft border-b px-4 py-4 md:px-5 md:py-4'>
        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div className='min-w-0 stack-tight'>
            <p className='type-kicker text-muted-foreground'>Editor</p>
            <h2 className='type-page-title text-foreground'>
              Draft the final prompt
            </h2>
            <p className='type-body-muted max-w-[60ch] text-muted-foreground'>
              Insert variables from the rail or with the slash command.
            </p>
          </div>

          <div className='flex flex-wrap gap-2 md:justify-end'>
            <Button className='px-4' onClick={onCopyMarkdown}>
              <Copy className='size-4' />
              Copy
            </Button>
            <Button
              className='px-4'
              onClick={onDownloadMarkdown}
              variant='outline'
            >
              <FileDown className='size-4' />
              Download .md
            </Button>
          </div>
        </div>
      </div>

      <div className='grid min-h-[calc(100vh-11rem)] lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]'>
        <div className='workspace-sidebar border-b border-border/80 px-4 py-4 lg:border-r lg:border-b-0 lg:px-4 lg:py-4'>
          <div className='mb-4 type-kicker text-muted-foreground'>Groups</div>

          {groups.length ? (
            <>
              <div className='mb-4 flex flex-wrap gap-2'>
                {groups.map((group) => {
                  const GroupIcon = ICON_MAP[group.icon];
                  const active = activeEditorGroupIds.includes(group.id);

                  return (
                    <button
                      className={cn(
                        'workspace-chip inline-flex min-h-9 items-center gap-2 px-2.5 py-1.5 transition',
                      )}
                      data-active={active}
                      key={group.id}
                      onClick={() => onToggleGroup(group.id)}
                      style={{
                        backgroundColor: active
                          ? `color-mix(in srgb, ${group.color} 42%, white)`
                          : `color-mix(in srgb, ${group.color} 26%, white)`,
                        borderColor: `color-mix(in srgb, ${group.color} 60%, var(--color-border))`,
                        color: group.textColor,
                      }}
                      type='button'
                    >
                      <GroupIcon className='size-3.5' />
                      <span className='min-w-0 break-words [overflow-wrap:anywhere]'>
                        {group.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <ScrollArea className='h-[calc(100vh-19rem)]'>
                <div className='space-y-4 pr-2'>
                  {visibleGroups.map((group) => {
                    const GroupIcon = ICON_MAP[group.icon];
                    const usedCount = group.variables.filter(
                      (variable) => (variableUsageMap[variable.id] ?? []).length > 0,
                    ).length;

                    return (
                      <section className='space-y-2.5' key={group.id}>
                        <div className='flex items-center justify-between gap-3'>
                          <div className='type-kicker flex min-w-0 items-center gap-2 text-muted-foreground'>
                            <GroupIcon className='size-3.5' />
                            <span className='min-w-0 break-words [overflow-wrap:anywhere]'>
                              {group.name}
                            </span>
                          </div>
                          <div className='workspace-tag shrink-0 px-2 py-0.5'>
                            {usedCount}/{group.variables.length} used
                          </div>
                        </div>

                        {group.variables.length ? (
                          group.variables.map((variable) => {
                            const parameters = getVariableParameters(variable);
                            const references =
                              variableUsageMap[variable.id] ?? [];
                            const hasUsage = references.length > 0;
                            const refsOpen =
                              openReferenceVariableId === variable.id;

                            return (
                              <div
                                className='workspace-card px-3 py-2.5 text-left transition'
                                key={variable.id}
                                style={{
                                  backgroundColor: hasUsage
                                    ? `color-mix(in srgb, ${group.color} 28%, white)`
                                    : `color-mix(in srgb, ${group.color} 14%, white)`,
                                  borderColor: `color-mix(in srgb, ${group.color} 60%, var(--color-border))`,
                                  opacity: hasUsage ? '1' : '0.78',
                                }}
                              >
                                <button
                                  className='flex w-full items-start justify-between gap-3 text-left'
                                  onClick={() =>
                                    editor
                                      ?.chain()
                                      .focus()
                                      .insertContent([
                                        {
                                          type: 'variablePill',
                                          attrs: {
                                            variableId: variable.id,
                                            displayName: getGroupVariableName(
                                              group,
                                              variable,
                                            ),
                                            description: variable.description,
                                            tooltip: variable.tooltip,
                                            groupColor: group.color,
                                            groupTextColor: group.textColor,
                                            groupIcon: group.icon,
                                            parameters,
                                            parameterValues: {},
                                          },
                                        },
                                        { type: 'text', text: ' ' },
                                      ])
                                      .run()
                                  }
                                  type='button'
                                >
                                  <div className='min-w-0'>
                                    <div className='type-ui-strong break-words [overflow-wrap:anywhere] text-foreground'>
                                      {getGroupVariableName(group, variable)}
                                    </div>
                                    <div className='type-caption mt-1 break-words text-muted-foreground'>
                                      {variable.description || 'No description'}
                                    </div>
                                    <div className='mt-2 grid gap-2'>
                                      <div className='flex flex-wrap gap-1.5'>
                                        <span
                                          className='workspace-tag px-1.5 py-0.5'
                                          data-variant={hasUsage ? 'success' : 'inactive'}
                                        >
                                          {hasUsage
                                            ? `${references.length} reference${references.length === 1 ? '' : 's'}`
                                            : 'Unused'}
                                        </span>
                                      </div>
                                      {parameters.length ? (
                                        <div className='flex flex-wrap items-center gap-1.5 text-left'>
                                          <span className='type-caption text-muted-foreground'>
                                            Parameters
                                          </span>
                                          {parameters.map((parameter) => (
                                          <span
                                            className='workspace-tag px-1.5 py-0.5'
                                            data-variant={
                                              parameter.required
                                                ? 'required'
                                                : 'default'
                                            }
                                            key={parameter.key}
                                          >
                                            {parameter.key}
                                          </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>

                                {hasUsage ? (
                                  <div className='mt-3 border-t border-border/70 pt-3'>
                                    <button
                                      className='type-caption font-medium text-muted-foreground transition hover:text-foreground'
                                      onClick={() =>
                                        onToggleReferenceOpen(variable.id)
                                      }
                                      type='button'
                                    >
                                      {refsOpen
                                        ? 'Hide references'
                                        : 'Show references'}
                                    </button>

                                    {refsOpen ? (
                                      <div className='mt-2 flex flex-wrap gap-1.5'>
                                        {references.map((reference) => (
                                          <button
                                            className='workspace-chip px-2 py-1 transition hover:bg-secondary hover:text-foreground'
                                            key={`${reference.variableId}-${reference.pos}`}
                                            onClick={() =>
                                              onJumpToReference(reference)
                                            }
                                            type='button'
                                          >
                                            Ref {reference.order}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className='type-body-muted rounded-[var(--radius-md)] border border-dashed border-border px-3 py-4 text-muted-foreground'>
                            No variables in this group yet.
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          ) : (
            <EmptyPanel
              icon={Braces}
              title='No groups yet'
              text='Create a group and map at least one variable before writing in the editor.'
            />
          )}
        </div>

        <div className='relative min-w-0'>
          <div className='relative mx-auto flex h-full w-full max-w-[920px] flex-col px-2 py-2 md:px-4 md:py-3 xl:px-6'>
            <div className='workspace-editor-canvas flex-1 px-1 py-2 md:px-2 md:py-3'>
              {editor ? <EditorContent editor={editor} /> : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
