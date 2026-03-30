import { AnimatePresence, motion } from 'framer-motion';
import { Check, PencilLine, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDroppable } from '@dnd-kit/core';

import { GROUP_COLORS, ICON_MAP } from '@/components/prompt-tool/config';
import {
  ActionIconButton,
  ConfirmDeleteActions,
} from '@/components/prompt-tool/shared';
import type {
  GroupRecord,
  IconName,
  VariableRecord,
} from '@/components/prompt-tool/types';
import {
  createId,
  getGroupVariableName,
  getVariableParameters,
} from '@/components/prompt-tool/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function GroupCard({
  duplicateVariableId,
  group,
  onAddCustomVariable,
  onDeleteGroup,
  onUpdateCustomVariable,
  onGroupColorChange,
  onGroupIconChange,
  onGroupNameChange,
  onGroupPrefixChange,
  onRemoveVariable,
}: {
  duplicateVariableId: string | null;
  group: GroupRecord;
  onAddCustomVariable: (
    variable: Pick<
      VariableRecord,
      'description' | 'displayName' | 'parameters'
    >,
  ) => void;
  onDeleteGroup: () => void;
  onUpdateCustomVariable: (
    variableId: string,
    variable: Pick<
      VariableRecord,
      'description' | 'displayName' | 'parameters'
    >,
  ) => void;
  onGroupColorChange: (colorIndex: number) => void;
  onGroupIconChange: (icon: IconName) => void;
  onGroupNameChange: (name: string) => void;
  onGroupPrefixChange: (prefix: string) => void;
  onRemoveVariable: (variableId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group-drop-${group.id}`,
  });
  const GroupIcon = ICON_MAP[group.icon];
  const activeColorIndex = Math.max(
    GROUP_COLORS.findIndex((color) => color.value === group.color),
    0,
  );
  const [showCustomVariableForm, setShowCustomVariableForm] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState(group.name);
  const [groupPrefixDraft, setGroupPrefixDraft] = useState(group.prefix);
  const [groupColorDraftIndex, setGroupColorDraftIndex] =
    useState(activeColorIndex);
  const [groupIconDraft, setGroupIconDraft] = useState<IconName>(group.icon);
  const [editingCustomVariableId, setEditingCustomVariableId] = useState<
    string | null
  >(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState(false);
  const [pendingVariableDeleteId, setPendingVariableDeleteId] = useState<
    string | null
  >(null);
  const [customVariableName, setCustomVariableName] = useState('');
  const [customVariableDescription, setCustomVariableDescription] =
    useState('');
  const [customParameters, setCustomParameters] = useState<
    Array<{
      id: string;
      key: string;
      type: string;
      required: boolean;
      description: string;
    }>
  >([]);

  const resetGroupSettingsDraft = () => {
    setGroupNameDraft(group.name);
    setGroupPrefixDraft(group.prefix);
    setGroupColorDraftIndex(activeColorIndex);
    setGroupIconDraft(group.icon);
  };

  const resetCustomVariableForm = () => {
    setEditingCustomVariableId(null);
    setCustomVariableName('');
    setCustomVariableDescription('');
    setCustomParameters([]);
    setShowCustomVariableForm(false);
  };

  const beginEditCustomVariable = (variable: VariableRecord) => {
    setPendingVariableDeleteId(null);
    setEditingCustomVariableId(variable.id);
    setCustomVariableName(variable.displayName);
    setCustomVariableDescription(variable.description);
    setCustomParameters(
      getVariableParameters(variable).map((parameter) => ({
        description: parameter.description,
        id: createId('param'),
        key: parameter.key,
        required: parameter.required,
        type: parameter.type,
      })),
    );
    setShowCustomVariableForm(true);
  };

  const submitCustomVariable = () => {
    const name = customVariableName.trim();

    if (!name) {
      toast('Custom variables need a name.');
      return;
    }

    const nextVariable = {
      description: customVariableDescription.trim(),
      displayName: name,
      parameters: customParameters
        .map((parameter) => ({
          description: parameter.description.trim(),
          key: parameter.key.trim(),
          required: parameter.required,
          type: parameter.type,
        }))
        .filter((parameter) => parameter.key),
    };

    if (editingCustomVariableId) {
      onUpdateCustomVariable(editingCustomVariableId, nextVariable);
      toast.success('Custom variable updated');
    } else {
      onAddCustomVariable(nextVariable);
      toast.success('Custom variable added');
    }

    resetCustomVariableForm();
  };

  const submitGroupSettings = () => {
    const nextName = groupNameDraft.trim();

    if (!nextName) {
      toast('Groups need a name.');
      return;
    }

    onGroupNameChange(nextName);
    onGroupPrefixChange(groupPrefixDraft.trim());
    onGroupIconChange(groupIconDraft);

    if (groupColorDraftIndex !== activeColorIndex) {
      onGroupColorChange(groupColorDraftIndex);
    }

    setShowGroupSettings(false);
    toast.success('Group updated');
  };

  return (
    <div className='workspace-panel-soft overflow-hidden rounded-[var(--radius-lg)]'>
      <div className='workspace-section workspace-divider-soft flex items-center justify-between gap-3 border-b px-4 py-4 md:px-4 md:py-4'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div
            className='flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2'
            style={{
              backgroundColor: group.color,
              borderColor: group.color,
              color: group.textColor,
            }}
          >
            <div
              className='inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border'
              style={{
                borderColor:
                  'color-mix(in srgb, currentColor 12%, transparent)',
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
              }}
            >
              <GroupIcon className='size-4' />
            </div>
            <div className='type-title-card min-w-0 break-words [overflow-wrap:anywhere]'>
              {group.name}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          <ActionIconButton
            active={showGroupSettings}
            onClick={() => {
              setPendingGroupDelete(false);
              setShowGroupSettings((current) => {
                const next = !current;

                if (next) {
                  resetGroupSettingsDraft();
                }

                return next;
              });
            }}
            title={showGroupSettings ? 'Close group editing' : 'Edit group'}
          >
            <PencilLine className='size-4' />
          </ActionIconButton>
          <ConfirmDeleteActions
            armed={pendingGroupDelete}
            confirmLabel='Delete group'
            onArm={() => {
              setShowGroupSettings(false);
              setPendingGroupDelete(true);
            }}
            onCancel={() => setPendingGroupDelete(false)}
            onConfirm={() => {
              setPendingGroupDelete(false);
              onDeleteGroup();
            }}
          />
        </div>
      </div>

      <div className='stack-section px-4 py-4 md:px-5 md:py-5'>
        {showGroupSettings ? (
          <div className='rounded-[var(--radius-lg)] border border-border/80 bg-card p-3.5'>
            <div className='grid gap-4'>
              <div>
                <div className='type-eyebrow mb-2 text-muted-foreground'>
                  Name
                </div>
                <Input
                  maxLength={80}
                  onChange={(event) => setGroupNameDraft(event.target.value)}
                  placeholder='Search tools'
                  value={groupNameDraft}
                />
              </div>

              <div>
                <div className='type-eyebrow mb-2 text-muted-foreground'>
                  Prefix
                </div>
                <Input
                  maxLength={40}
                  onChange={(event) => setGroupPrefixDraft(event.target.value)}
                  placeholder='mall_directory__'
                  value={groupPrefixDraft}
                />
              </div>

              <div className='stack-tight'>
                <div className='type-eyebrow text-muted-foreground'>Color</div>
                <div className='flex flex-wrap gap-2'>
                  {GROUP_COLORS.map((color, index) => (
                    <button
                      aria-label={`Set color to ${color.name}`}
                      className={cn(
                        'relative flex size-9 items-center justify-center rounded-full border transition',
                        groupColorDraftIndex === index
                          ? 'border-foreground bg-card ring-2 ring-foreground/10'
                          : 'border-border bg-background hover:border-foreground/15 hover:bg-secondary',
                      )}
                      key={color.name}
                      onClick={() => setGroupColorDraftIndex(index)}
                      type='button'
                    >
                      <span
                        className='size-4 rounded-full border border-black/5'
                        style={{ backgroundColor: color.value }}
                      />
                      {groupColorDraftIndex === index ? (
                        <span className='absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-foreground text-background'>
                          <Check className='size-2.5' />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className='stack-tight'>
                <div className='type-eyebrow text-muted-foreground'>Icon</div>
                <div className='flex flex-wrap gap-2'>
                  {(Object.keys(ICON_MAP) as IconName[]).map((iconName) => {
                    const Icon = ICON_MAP[iconName];
                    const active = groupIconDraft === iconName;

                    return (
                      <button
                        className={cn(
                          'workspace-chip flex min-h-10 items-center gap-2 px-3 py-2 transition',
                          active
                            ? ''
                            : 'hover:bg-accent hover:text-accent-foreground',
                        )}
                        data-active={active}
                        key={iconName}
                        onClick={() => setGroupIconDraft(iconName)}
                        type='button'
                      >
                        <Icon className='size-3.5' />
                        {iconName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <Button
                  onClick={() => {
                    resetGroupSettingsDraft();
                    setShowGroupSettings(false);
                  }}
                  type='button'
                  variant='outline'
                >
                  Cancel
                </Button>
                <Button
                  className='px-4'
                  onClick={submitGroupSettings}
                  type='button'
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'workspace-dropzone border-2 border-dashed px-4 py-4 transition',
          )}
          data-over={isOver}
          ref={setNodeRef}
        >
          <div className='type-body-muted text-muted-foreground'>
            {isOver ? 'Release to add variable' : 'Drag array items here'}
          </div>
        </div>

        <div className='flex justify-start'>
          <Button
            onClick={() => {
              if (showCustomVariableForm) {
                resetCustomVariableForm();
                return;
              }

              setEditingCustomVariableId(null);
              setShowCustomVariableForm(true);
            }}
            type='button'
            variant='outline'
          >
            {showCustomVariableForm ? 'Close' : 'Add Custom Variable'}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showCustomVariableForm ? (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className='overflow-hidden'
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className='workspace-muted-inset p-3.5'>
                <div className='grid gap-3'>
                  <div>
                    <label className='type-kicker mb-2 block text-muted-foreground'>
                      Variable name
                    </label>
                    <Input
                      maxLength={120}
                      onChange={(event) =>
                        setCustomVariableName(event.target.value)
                      }
                      placeholder='see_place_detail'
                      value={customVariableName}
                    />
                  </div>

                  <div>
                    <label className='type-kicker mb-2 block text-muted-foreground'>
                      Description
                    </label>
                    <Textarea
                      className='min-h-24'
                      maxLength={400}
                      onChange={(event) =>
                        setCustomVariableDescription(event.target.value)
                      }
                      placeholder='Explain what this variable does'
                      value={customVariableDescription}
                    />
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='type-kicker block text-muted-foreground'>
                        Parameters
                      </label>
                      <Button
                        onClick={() =>
                          setCustomParameters((current) => [
                            ...current,
                            {
                              description: '',
                              id: createId('param'),
                              key: '',
                              required: false,
                              type: 'string',
                            },
                          ])
                        }
                        size='sm'
                        type='button'
                        variant='outline'
                      >
                        Add Parameter
                      </Button>
                    </div>

                    {customParameters.length ? (
                      <div className='space-y-2'>
                        {customParameters.map((parameter) => (
                          <div
                            className='workspace-card p-3'
                            key={parameter.id}
                          >
                            <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_auto]'>
                              <Input
                                maxLength={60}
                                onChange={(event) =>
                                  setCustomParameters((current) =>
                                    current.map((entry) =>
                                      entry.id === parameter.id
                                        ? { ...entry, key: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                placeholder='occupant_id'
                                value={parameter.key}
                              />
                              <select
                                className='h-[var(--input-height)] rounded-[var(--radius-md)] border border-input bg-background px-3 text-[var(--text-md)] tracking-[-0.014em] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20'
                                onChange={(event) =>
                                  setCustomParameters((current) =>
                                    current.map((entry) =>
                                      entry.id === parameter.id
                                        ? { ...entry, type: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                                value={parameter.type}
                              >
                                <option value='string'>string</option>
                                <option value='number'>number</option>
                                <option value='boolean'>boolean</option>
                              </select>
                              <label className='type-body-muted flex items-center gap-2 text-muted-foreground'>
                                <input
                                  checked={parameter.required}
                                  className='size-4 border-border'
                                  onChange={(event) =>
                                    setCustomParameters((current) =>
                                      current.map((entry) =>
                                        entry.id === parameter.id
                                          ? {
                                              ...entry,
                                              required: event.target.checked,
                                            }
                                          : entry,
                                      ),
                                    )
                                  }
                                  type='checkbox'
                                />
                                Required
                              </label>
                            </div>

                            <div className='mt-2 flex items-center gap-2'>
                              <Input
                                className='flex-1'
                                maxLength={160}
                                onChange={(event) =>
                                  setCustomParameters((current) =>
                                    current.map((entry) =>
                                      entry.id === parameter.id
                                        ? {
                                            ...entry,
                                            description: event.target.value,
                                          }
                                        : entry,
                                    ),
                                  )
                                }
                                placeholder='Parameter description'
                                value={parameter.description}
                              />
                              <button
                                className='rounded-full border border-transparent p-2 text-muted-foreground transition hover:bg-secondary hover:text-accent-foreground'
                                onClick={() =>
                                  setCustomParameters((current) =>
                                    current.filter(
                                      (entry) => entry.id !== parameter.id,
                                    ),
                                  )
                                }
                                type='button'
                              >
                                <X className='size-4' />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='type-body-muted rounded-[var(--radius-md)] border border-dashed border-border px-4 py-4 text-muted-foreground'>
                        No parameters yet.
                      </div>
                    )}
                  </div>

                  <div className='flex justify-end gap-2 pt-1'>
                    <Button
                      onClick={resetCustomVariableForm}
                      type='button'
                      variant='outline'
                    >
                      Cancel
                    </Button>
                    <Button
                      className='px-4'
                      onClick={submitCustomVariable}
                      type='button'
                    >
                      {editingCustomVariableId ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className='space-y-3'>
          {group.variables.length ? (
            group.variables.map((variable) => {
              const parameters = getVariableParameters(variable);

              return (
                <div
                  className={cn(
                    'workspace-card flex items-start justify-between gap-4 px-3.5 py-3',
                    duplicateVariableId === variable.id &&
                      'animate-variable-shake',
                  )}
                  key={variable.id}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${group.color} 28%, white)`,
                    borderColor: `color-mix(in srgb, ${group.color} 60%, var(--color-border))`,
                  }}
                >
                  <div className='min-w-0'>
                    <div className='flex items-center gap-3'>
                      <div className='min-w-0'>
                        <div className='type-ui-strong break-words [overflow-wrap:anywhere] text-foreground'>
                          {getGroupVariableName(group, variable)}
                        </div>
                        <div className='type-caption break-words text-muted-foreground'>
                          {variable.description || 'No description'}
                        </div>
                        {parameters.length ? (
                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            {parameters.map((parameter) => (
                              <span
                                className='workspace-tag px-1.5 py-0.5'
                                data-variant={
                                  parameter.required ? 'required' : 'default'
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
                  </div>

                  <div className='flex items-center gap-1'>
                    {variable.sourceId === 'custom' ? (
                      <ActionIconButton
                        onClick={() => beginEditCustomVariable(variable)}
                        title='Edit custom variable'
                      >
                        <PencilLine className='size-4' />
                      </ActionIconButton>
                    ) : null}
                    <ConfirmDeleteActions
                      armed={pendingVariableDeleteId === variable.id}
                      confirmLabel='Delete variable'
                      onArm={() => setPendingVariableDeleteId(variable.id)}
                      onCancel={() => setPendingVariableDeleteId(null)}
                      onConfirm={() => {
                        setPendingVariableDeleteId(null);
                        onRemoveVariable(variable.id);
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className='type-body-muted rounded-[var(--radius-md)] border border-dashed border-border px-4 py-5 text-muted-foreground'>
              Drag a field into this group to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
