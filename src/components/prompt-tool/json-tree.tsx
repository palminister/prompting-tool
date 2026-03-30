import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { memo, useState } from 'react';

import type { DragItem, JsonValue, SourceRecord } from '@/components/prompt-tool/types';
import {
  displayPathSegment,
  extractParameterDefinitions,
  isPlainObject,
  renderJsonPrimitive,
} from '@/components/prompt-tool/utils';
import { cn } from '@/lib/utils';

export const JsonTree = memo(function JsonTree({
  mappedItemIds,
  source,
  value,
}: {
  mappedItemIds: Set<string>;
  source: SourceRecord;
  value: JsonValue;
}) {
  return (
    <div className='min-w-0 space-y-1'>
      <JsonNode
        keyPath='$'
        level={0}
        mappedItemIds={mappedItemIds}
        source={source}
        value={value}
      />
    </div>
  );
});

function JsonNode({
  mappedItemIds,
  source,
  value,
  keyPath,
  level,
}: {
  mappedItemIds: Set<string>;
  source: SourceRecord;
  value: JsonValue;
  keyPath: string;
  level: number;
}) {
  if (Array.isArray(value)) {
    const draggable = level <= 1;

    return (
      <div className='pl-4'>
        <div className='type-caption text-muted-foreground'>
          <span className='font-medium text-foreground'>{displayPathSegment(keyPath)}</span>{' '}
          <span className='text-[var(--color-text-subtle)]'>[{value.length}]</span>
        </div>
        <div className='mt-1 border-l border-[color:color-mix(in_oklch,var(--border)_84%,transparent)] pl-4'>
          {value.map((entry, index) =>
            draggable && isPlainObject(entry) ? (
              <DraggableJsonItem
                item={entry}
                itemIndex={index}
                key={`${keyPath}-${index}`}
                keyPath={keyPath}
                mappedItemIds={mappedItemIds}
                source={source}
              />
            ) : (
              <JsonNode
                key={`${keyPath}-${index}`}
                keyPath={`${keyPath}[${index}]`}
                level={level + 1}
                mappedItemIds={mappedItemIds}
                source={source}
                value={entry}
              />
            ),
          )}
        </div>
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className='pl-4'>
        {Object.entries(value).map(([key, child]) => (
          <div className='mb-1' key={`${keyPath}.${key}`}>
            <div className='type-caption text-muted-foreground'>
              <span className='font-medium text-foreground'>{key}</span>
              <span className='text-[var(--color-text-subtle)]'>:</span>
            </div>
            <JsonNode
              keyPath={keyPath === '$' ? key : `${keyPath}.${key}`}
              level={level + 1}
              mappedItemIds={mappedItemIds}
              source={source}
              value={child}
            />
          </div>
        ))}
      </div>
    );
  }

  return <div className='type-caption pl-8 text-muted-foreground'>{renderJsonPrimitive(value)}</div>;
}

const DraggableJsonItem = memo(function DraggableJsonItem({
  item,
  itemIndex,
  keyPath,
  mappedItemIds,
  source,
}: {
  item: { [key: string]: JsonValue };
  itemIndex: number;
  keyPath: string;
  mappedItemIds: Set<string>;
  source: SourceRecord;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = String(item.name ?? `Item ${itemIndex + 1}`);
  const description = String(item.description ?? '');
  const payload: DragItem = {
    id: `${source.id}:${keyPath}:${itemIndex}`,
    sourceId: source.id,
    sourceLabel: source.label,
    keyPath,
    itemIndex,
    name,
    description,
    parameters: extractParameterDefinitions(item),
  };
  const isConsumed = mappedItemIds.has(payload.id);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    isDragging,
  } =
    useDraggable({
      id: payload.id,
      data: { item: payload },
    });

  if (isConsumed) {
    return null;
  }

  return (
    <div
      className={cn(
        'workspace-card workspace-draggable-item group mb-2 min-w-0 p-3 transition',
        isDragging && 'opacity-30',
      )}
      onClick={() => setExpanded((current) => !current)}
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 text-left'>
          <div className='flex items-center gap-2'>
            <span className='workspace-tag px-2 py-0.5'>
              {itemIndex}
            </span>
            <span className='type-title-card [overflow-wrap:anywhere]'>{name}</span>
          </div>
          <div className='type-body-muted mt-1 [overflow-wrap:anywhere]'>
            {description || 'No description'}
          </div>
          {payload.parameters.length ? (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {payload.parameters.map((parameter) => (
                <span
                  className={cn(
                    'workspace-tag px-2 py-0.5',
                  )}
                  data-variant={parameter.required ? 'required' : 'default'}
                  key={parameter.key}
                >
                  {parameter.key}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className='workspace-drag-handle opacity-70 transition group-hover:opacity-100'
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          ref={setActivatorNodeRef}
          title='Drag into a variable group'
          type='button'
          {...attributes}
          {...listeners}
        >
          <GripVertical className='size-4' />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className='workspace-card mt-3 min-w-0 overflow-hidden p-3.5'
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className='mb-3 flex items-start justify-between gap-3 border-b border-border pb-3'>
              <div className='min-w-0'>
                <div className='type-title-card text-foreground'>JSON Preview</div>
                <div className='type-caption mt-1 text-muted-foreground'>
                  Full payload for {name}
                </div>
              </div>
              <span className='workspace-tag shrink-0 px-2 py-0.5'>Preview</span>
            </div>
            <div className='workspace-muted-inset min-w-0 overflow-hidden rounded-[var(--radius-md)] p-3'>
              <pre className='max-w-full overflow-x-auto font-[family:var(--font-ibm-plex-mono)] text-[var(--text-secondary)] leading-6 text-foreground/78'>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
