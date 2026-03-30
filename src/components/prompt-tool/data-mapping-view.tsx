import { AnimatePresence, motion } from 'framer-motion';
import { Database, Plus } from 'lucide-react';

import { GroupCard } from '@/components/prompt-tool/group-card';
import { JsonTree } from '@/components/prompt-tool/json-tree';
import { EmptyPanel } from '@/components/prompt-tool/shared';
import type {
  GroupDraft,
  GroupRecord,
  IconName,
  SourceDraft,
  SourceRecord,
  VariableRecord,
} from '@/components/prompt-tool/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export function DataMappingView({
  activeSourceId,
  duplicateVariableId,
  groupDraft,
  groups,
  mappedItemIds,
  onActiveSourceChange,
  onAddCustomVariable,
  onCreateGroup,
  onDeleteGroup,
  onGroupColorChange,
  onGroupDraftChange,
  onGroupIconChange,
  onGroupNameChange,
  onGroupPrefixChange,
  onParseSource,
  onRemoveVariable,
  onSourceDraftChange,
  onToggleGroupCreate,
  onToggleGroupForm,
  onToggleSourceForm,
  onUpdateCustomVariable,
  showGroupForm,
  showSourceForm,
  sourceDraft,
  sourceError,
  sources,
}: {
  activeSourceId: string | null;
  duplicateVariableId: string | null;
  groupDraft: GroupDraft;
  groups: GroupRecord[];
  mappedItemIds: Set<string>;
  onActiveSourceChange: (value: string) => void;
  onAddCustomVariable: (
    groupId: string,
    variable: Pick<VariableRecord, 'description' | 'displayName' | 'parameters'>,
  ) => void;
  onCreateGroup: () => void;
  onDeleteGroup: (group: GroupRecord) => void;
  onGroupColorChange: (groupId: string, colorIndex: number) => void;
  onGroupDraftChange: (draft: GroupDraft) => void;
  onGroupIconChange: (groupId: string, icon: IconName) => void;
  onGroupNameChange: (groupId: string, name: string) => void;
  onGroupPrefixChange: (groupId: string, prefix: string) => void;
  onParseSource: () => void;
  onRemoveVariable: (groupId: string, variableId: string) => void;
  onSourceDraftChange: (draft: SourceDraft) => void;
  onToggleGroupCreate: () => void;
  onToggleGroupForm: () => void;
  onToggleSourceForm: () => void;
  onUpdateCustomVariable: (
    groupId: string,
    variableId: string,
    variable: Pick<VariableRecord, 'description' | 'displayName' | 'parameters'>,
  ) => void;
  showGroupForm: boolean;
  showSourceForm: boolean;
  sourceDraft: SourceDraft;
  sourceError: string | null;
  sources: SourceRecord[];
}) {
  const canParseSource = sourceDraft.rawJson.trim().length > 0;
  const canCreateGroup = groupDraft.name.trim().length > 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className='grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[minmax(0,1.14fr)_minmax(23rem,0.86fr)] xl:gap-6'
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      <section className='workspace-panel overflow-hidden'>
        <div className='workspace-section workspace-divider-soft border-b px-4 py-4 md:px-5 md:py-4'>
          <div className='flex items-start justify-between gap-6'>
            <div className='stack-tight min-w-0'>
              <p className='type-kicker text-muted-foreground'>Source</p>
              <h2 className='type-page-title text-foreground'>
                Add a source
              </h2>
              <p className='type-body-muted max-w-[54ch] text-muted-foreground'>
                Paste a JSON payload, then inspect the fields you want to reuse.
              </p>
            </div>
            <Button className='px-4' onClick={onToggleSourceForm}>
              <Plus className='size-4' />
              Add Source
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {showSourceForm ? (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                className='mt-5 overflow-hidden'
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className='workspace-muted-inset p-4 md:p-4'>
                  <div className='grid gap-4'>
                    <div>
                      <label
                        className='type-kicker mb-2 block text-muted-foreground'
                        htmlFor='source-label'
                      >
                        Source label
                      </label>
                      <Input
                        id='source-label'
                        maxLength={120}
                        onChange={(event) =>
                          onSourceDraftChange({
                            ...sourceDraft,
                            label: event.target.value,
                          })
                        }
                        placeholder='Functions payload'
                        value={sourceDraft.label}
                      />
                    </div>

                    <div>
                      <label
                        className='type-kicker mb-2 block text-muted-foreground'
                        htmlFor='source-json'
                      >
                        Raw JSON
                      </label>
                      <Textarea
                        className='type-code-ui min-h-44'
                        id='source-json'
                        onChange={(event) =>
                          onSourceDraftChange({
                            ...sourceDraft,
                            rawJson: event.target.value,
                          })
                        }
                        placeholder='{"functions":[{"name":"search_directory","description":"Search all files"}]}'
                        value={sourceDraft.rawJson}
                      />
                    </div>

                    {sourceError ? (
                      <div aria-live='polite' className='type-body-muted text-[color:color-mix(in_oklch,var(--destructive)_82%,var(--foreground))]'>
                        {sourceError}
                      </div>
                    ) : null}

                    <div className='flex justify-end gap-2 pt-1'>
                      <Button onClick={onToggleSourceForm} type='button' variant='outline'>
                        Cancel
                      </Button>
                      <Button
                        className='px-4'
                        disabled={!canParseSource}
                        onClick={onParseSource}
                      >
                        Parse
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className='workspace-slab grid gap-4 md:px-5 md:py-4'>
          {sources.length ? (
            <Tabs onValueChange={onActiveSourceChange} value={activeSourceId ?? sources[0]?.id}>
              <TabsList className='h-auto flex-wrap p-1'>
                {sources.map((source) => (
                  <TabsTrigger className='px-3 py-2' key={source.id} value={source.id}>
                    <span className='max-w-44 whitespace-normal break-words text-left leading-5 [overflow-wrap:anywhere]'>{source.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {sources.map((source) => (
                <TabsContent key={source.id} value={source.id}>
                  <ScrollArea className='workspace-dark-panel h-[calc(100vh-18rem)] min-w-0 p-4 md:p-4'>
                    <div className='type-body text-foreground/72'>
                      <JsonTree mappedItemIds={mappedItemIds} source={source} value={source.data} />
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <EmptyPanel
              icon={Database}
              title='No sources yet'
              text='Add a source first, then inspect the payload and drag the fields you want to reuse.'
            />
          )}
        </div>
      </section>

      <section className='workspace-panel overflow-hidden'>
        <div className='workspace-section workspace-divider-soft border-b px-4 py-4 md:px-5 md:py-4'>
          <div className='flex items-start justify-between gap-6'>
            <div className='stack-tight min-w-0'>
              <p className='type-kicker text-muted-foreground'>Groups</p>
              <h2 className='type-page-title text-foreground'>
                Build variable groups
              </h2>
              <p className='type-body-muted max-w-[54ch] text-muted-foreground'>
                Drag fields into groups, then clean up names only where needed.
              </p>
            </div>
            <Button className='px-4' onClick={onToggleGroupForm}>
              <Plus className='size-4' />
              New Group
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {showGroupForm ? (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                className='mt-5 overflow-hidden'
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className='workspace-muted-inset p-4 md:p-4'>
                  <div className='grid gap-4'>
                    <div>
                      <label
                        className='type-kicker mb-2 block text-muted-foreground'
                        htmlFor='group-name'
                      >
                        Group name
                      </label>
                      <Input
                        id='group-name'
                        maxLength={80}
                        onChange={(event) =>
                          onGroupDraftChange({ ...groupDraft, name: event.target.value })
                        }
                        placeholder='Search tools'
                        value={groupDraft.name}
                      />
                    </div>

                    <div className='type-caption text-muted-foreground'>
                      Appearance can be adjusted later.
                    </div>

                    <div className='flex justify-end gap-2 pt-1'>
                      <Button onClick={onToggleGroupCreate} type='button' variant='outline'>
                        Cancel
                      </Button>
                      <Button
                        className='px-4'
                        disabled={!canCreateGroup}
                        onClick={onCreateGroup}
                      >
                        Create Group
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <ScrollArea className='h-[calc(100vh-14rem)] px-4 py-4 md:px-5 md:py-5'>
          <div className='space-y-4 pr-2'>
            {groups.map((group) => (
              <GroupCard
                duplicateVariableId={duplicateVariableId}
                group={group}
                key={group.id}
                onAddCustomVariable={(variable) => onAddCustomVariable(group.id, variable)}
                onDeleteGroup={() => onDeleteGroup(group)}
                onGroupColorChange={(colorIndex) => onGroupColorChange(group.id, colorIndex)}
                onGroupIconChange={(icon) => onGroupIconChange(group.id, icon)}
                onGroupNameChange={(name) => onGroupNameChange(group.id, name)}
                onGroupPrefixChange={(prefix) => onGroupPrefixChange(group.id, prefix)}
                onRemoveVariable={(variableId) => onRemoveVariable(group.id, variableId)}
                onUpdateCustomVariable={(variableId, variable) =>
                  onUpdateCustomVariable(group.id, variableId, variable)
                }
              />
            ))}
          </div>
        </ScrollArea>
      </section>
    </motion.div>
  );
}
