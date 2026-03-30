'use client';

import {
  mergeAttributes,
  Node as TipTapNode,
  type NodeViewRendererProps,
} from '@tiptap/core';
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';

export type VariableParameterDefinition = {
  key: string;
  type: string;
  required: boolean;
  description: string;
};

export type VariableParameterReference = {
  displayName: string;
  type: 'variable';
  variableId: string;
};

export type VariableParameterValue =
  | string
  | boolean
  | VariableParameterReference;

export type VariableParameterValues = Record<string, VariableParameterValue>;

export type VariableSuggestionItem = {
  variableId: string;
  displayName: string;
  description: string;
  tooltip: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  groupTextColor: string;
  groupIcon: string;
  parameters: VariableParameterDefinition[];
};

type SuggestionListProps = {
  items: VariableSuggestionItem[];
  command: (item: VariableSuggestionItem) => void;
};

type InputSuggestionMatch = {
  from: number;
  query: string;
  to: number;
};

class SuggestionListView {
  element: HTMLDivElement;

  private props: SuggestionListProps;

  private selectedIndex = 0;

  private scrollTop = 0;

  constructor(props: SuggestionListProps) {
    this.element = document.createElement('div');
    this.props = props;
    this.render();
  }

  update(props: SuggestionListProps) {
    this.props = props;
    if (this.selectedIndex >= props.items.length) {
      this.selectedIndex = 0;
    }
    this.render();
  }

  onKeyDown({ event }: SuggestionKeyDownProps) {
    if (!this.props.items.length) {
      return false;
    }

    if (event.key === 'ArrowUp') {
      this.selectedIndex =
        (this.selectedIndex + this.props.items.length - 1) %
        this.props.items.length;
      this.render();
      return true;
    }

    if (event.key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.props.items.length;
      this.render();
      return true;
    }

    if (event.key === 'Enter') {
      const item = this.props.items[this.selectedIndex];
      if (item) {
        this.props.command(item);
        return true;
      }
    }

    return false;
  }

  destroy() {
    this.element.replaceChildren();
  }

  private render() {
    const existingScrollArea = this.element.querySelector<HTMLElement>(
      '[data-slot="variable-suggestion-scroll"]',
    );
    if (existingScrollArea) {
      this.scrollTop = existingScrollArea.scrollTop;
    }

    this.element.className =
      'workspace-card w-[24rem] overflow-hidden p-2.5 text-foreground';
    this.element.style.fontFamily = 'var(--font-sans)';
    this.element.replaceChildren();

    const { items } = this.props;

    if (!items.length) {
      const emptyState = document.createElement('div');
      emptyState.className =
        'workspace-muted-inset rounded-[var(--radius-md)] border border-dashed border-border px-4 py-6 text-center type-body-muted text-muted-foreground';
      emptyState.textContent = 'No variables mapped yet. Go to Data Mapping.';
      this.element.append(emptyState);
      return;
    }

    const scrollArea = document.createElement('div');
    scrollArea.dataset.slot = 'variable-suggestion-scroll';
    scrollArea.className = 'max-h-80 overflow-y-auto overscroll-contain pr-1';

    const groups = new Map<string, VariableSuggestionItem[]>();
    items.forEach((item) => {
      const groupItems = groups.get(item.groupId);
      if (groupItems) {
        groupItems.push(item);
      } else {
        groups.set(item.groupId, [item]);
      }
    });

    let runningIndex = -1;

    groups.forEach((groupItems) => {
      const group = document.createElement('div');
      group.className = 'mb-2 last:mb-0';

      const header = document.createElement('div');
      header.className =
        'mb-1 flex items-center gap-2 px-2 py-1 type-kicker text-muted-foreground';

      const dot = document.createElement('span');
      dot.className = 'size-2.5 rounded-full';
      dot.style.backgroundColor = groupItems[0].groupColor;

      const label = document.createElement('span');
      label.textContent = groupItems[0].groupName;

      header.append(dot, label);

      const list = document.createElement('div');
      list.className = 'space-y-1';

      groupItems.forEach((item) => {
        runningIndex += 1;
        const itemIndex = runningIndex;
        const active = itemIndex === this.selectedIndex;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `workspace-card flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition ${
          active
            ? 'text-foreground'
            : 'text-foreground hover:bg-secondary/70'
        }`;
        button.style.borderColor = `color-mix(in srgb, ${item.groupColor} 60%, var(--color-border))`;
        button.style.backgroundColor = active
          ? `color-mix(in srgb, ${item.groupColor} 38%, white)`
          : `color-mix(in srgb, ${item.groupColor} 28%, white)`;
        button.onmouseenter = () => {
          if (this.selectedIndex !== itemIndex) {
            this.selectedIndex = itemIndex;
            this.render();
          }
        };
        button.onmousedown = (event) => {
          event.preventDefault();
          this.props.command(item);
        };

        const textWrap = document.createElement('div');
        textWrap.className = 'min-w-0';

        const name = document.createElement('div');
        name.className = 'type-ui-strong [overflow-wrap:anywhere] text-foreground';
        name.style.fontFamily = 'var(--font-sans)';
        name.textContent = item.displayName;

        const description = document.createElement('div');
        description.className = 'type-caption mt-1 [overflow-wrap:anywhere] text-muted-foreground';
        description.textContent = item.description || 'No description';

        textWrap.append(name, description);

        const badge = document.createElement('span');
        badge.className =
          'workspace-tag shrink-0 px-2 py-0.5';
        badge.style.backgroundColor = item.groupColor;
        badge.style.borderColor = 'transparent';
        badge.style.color = item.groupTextColor;
        renderIconInto(badge, item.groupIcon);

        button.append(textWrap, badge);
        list.append(button);
      });

      group.append(header, list);
      scrollArea.append(group);
    });

    this.element.append(scrollArea);
    requestAnimationFrame(() => {
      const nextScrollArea = this.element.querySelector<HTMLElement>(
        '[data-slot="variable-suggestion-scroll"]',
      );
      if (nextScrollArea) {
        nextScrollArea.scrollTop = this.scrollTop;
      }
    });
  }
}

class VariablePillNodeView {
  dom: HTMLSpanElement;

  private button: HTMLButtonElement;

  private label: HTMLSpanElement;

  private icon: HTMLSpanElement;

  private panel: HTMLSpanElement | null = null;

  private panelCleanupCallbacks: Array<() => void> = [];

  private props: NodeViewRendererProps;

  private selected = false;

  private getItems: () => VariableSuggestionItem[];

  constructor(
    props: NodeViewRendererProps,
    getItems: () => VariableSuggestionItem[],
  ) {
    this.props = props;
    this.getItems = getItems;

    this.dom = document.createElement('span');
    this.dom.className = 'variable-pill-node not-prose';
    this.dom.contentEditable = 'false';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'variable-pill';
    this.button.onmousedown = (event) => {
      event.preventDefault();
      this.handleSelect();
    };

    this.icon = document.createElement('span');
    this.icon.className = 'variable-pill__icon';
    this.icon.setAttribute('aria-hidden', 'true');

    this.label = document.createElement('span');
    this.label.className = 'variable-pill__label';

    this.button.append(this.icon, this.label);
    this.dom.append(this.button);

    this.render();
  }

  update(node: NodeViewRendererProps['node']) {
    if (node.type.name !== this.props.node.type.name) {
      return false;
    }

    this.props = {
      ...this.props,
      node,
    };
    this.render();
    return true;
  }

  selectNode() {
    this.selected = true;
    this.render();
  }

  deselectNode() {
    this.selected = false;
    this.render();
  }

  stopEvent(event: Event) {
    const target = event.target;
    return target instanceof Node ? this.dom.contains(target) : false;
  }

  ignoreMutation() {
    return true;
  }

  destroy() {
    this.button.onmousedown = null;
    this.destroyPanel();
  }

  private destroyPanel() {
    this.panelCleanupCallbacks.forEach((cleanup) => cleanup());
    this.panelCleanupCallbacks = [];

    if (!this.panel) {
      return;
    }

    this.panel.replaceChildren();
    this.panel.remove();
    this.panel = null;
  }

  private handleSelect() {
    const pos = this.props.getPos();

    if (typeof pos !== 'number') {
      return;
    }

    this.props.editor.commands.setNodeSelection(pos);
  }

  private render() {
    const attrs = this.props.node.attrs as {
      description?: string;
      displayName?: string;
      groupColor?: string;
      groupIcon?: string;
      groupTextColor?: string;
      parameterValues?: VariableParameterValues;
      parameters?: VariableParameterDefinition[];
      tooltip?: string;
    };

    const parameters = attrs.parameters ?? [];
    const parameterValues = attrs.parameterValues ?? {};
    const pillLabel = formatVariableInvocation(
      attrs.displayName ?? '',
      parameters,
      parameterValues,
      {
        includeOptionalEmpty: false,
        preferPlaceholderNames: true,
      },
    );

    this.dom.dataset.selected = this.selected ? 'true' : 'false';
    this.button.style.setProperty('--pill-bg', attrs.groupColor ?? '#E7EEF8');
    this.button.style.setProperty(
      '--pill-fg',
      attrs.groupTextColor ?? '#214768',
    );
    this.button.title = attrs.tooltip ?? '';
    renderIconInto(this.icon, attrs.groupIcon ?? 'Braces');
    this.renderInvocationLabel(
      this.label,
      attrs.displayName ?? '',
      parameters,
      parameterValues,
      pillLabel,
    );

    if (this.selected && parameters.length) {
      this.renderPanel(attrs, parameters, parameterValues);
    } else {
      this.destroyPanel();
    }
  }

  private renderPanel(
    attrs: {
      description?: string;
      displayName?: string;
    },
    parameters: VariableParameterDefinition[],
    parameterValues: VariableParameterValues,
  ) {
    this.destroyPanel();

    const panel = document.createElement('span');
    panel.className = 'variable-pill-panel';
    panel.onmousedown = (event) => {
      event.stopPropagation();
    };

    const header = document.createElement('span');
    header.className = 'variable-pill-panel__header';

    const title = document.createElement('span');
    title.className = 'variable-pill-panel__title';
    title.textContent = attrs.displayName ?? '';

    const hint = document.createElement('span');
    hint.className = 'variable-pill-panel__hint';
    hint.textContent = attrs.description ?? '';

    header.append(title, hint);

    const list = document.createElement('span');
    list.className = 'variable-pill-panel__list';

    parameters.forEach((parameter) => {
      const currentValue = parameterValues[parameter.key];

      const field = document.createElement('span');
      field.className = 'variable-pill-field';

      const meta = document.createElement('span');
      meta.className = 'variable-pill-field__meta';

      const name = document.createElement('span');
      name.className = 'variable-pill-field__name';
      name.textContent = parameter.key;

      const badge = document.createElement('span');
      badge.className = `variable-pill-field__badge ${
        parameter.required
          ? 'variable-pill-field__badge--required'
          : 'variable-pill-field__badge--optional'
      }`;
      badge.textContent = parameter.required ? 'Required' : 'Optional';

      meta.append(name, badge);

      const description = document.createElement('span');
      description.className = 'variable-pill-field__description';
      description.textContent = parameter.description || 'No description';

      field.append(meta, description);

      if (parameter.type === 'boolean') {
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'variable-pill-field__toggle';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(currentValue);
        input.onclick = (event) => {
          event.stopPropagation();
        };
        input.onchange = (event) => {
          const target = event.currentTarget as HTMLInputElement;
          queueMicrotask(() =>
            this.updateAttributes({
              parameterValues: {
                ...parameterValues,
                [parameter.key]: target.checked,
              },
            }),
          );
        };

        toggleLabel.append(input, document.createTextNode('Enabled'));
        field.append(toggleLabel);
      } else {
        field.append(
          this.createParameterValueEditor(
            parameter,
            currentValue,
            parameterValues,
          ),
        );
      }

      list.append(field);
    });

    panel.append(header, list);
    this.panel = panel;
    this.dom.append(panel);
  }

  private updateAttributes(attributes: Record<string, unknown>) {
    const pos = this.props.getPos();

    if (typeof pos !== 'number') {
      return;
    }

    const transaction = this.props.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.props.node.attrs,
      ...attributes,
    });

    this.props.view.dispatch(transaction);
  }

  private renderInvocationLabel(
    container: HTMLElement,
    displayName: string,
    parameters: VariableParameterDefinition[],
    parameterValues: VariableParameterValues,
    fallbackLabel: string,
  ) {
    container.replaceChildren();

    if (!parameters.length) {
      container.textContent = fallbackLabel;
      return;
    }

    const base = document.createElement('span');
    base.className = 'variable-pill__label-base';
    base.textContent = displayName;
    container.append(base, document.createTextNode('('));

    const parts = parameters
      .map((parameter) => {
        const rawValue = parameterValues[parameter.key];

        if (typeof rawValue === 'boolean') {
          return rawValue ? { parameter, value: rawValue } : null;
        }

        if (isVariableParameterReference(rawValue)) {
          return { parameter, value: rawValue };
        }

        if (typeof rawValue === 'string' && rawValue.trim()) {
          return { parameter, value: rawValue.trim() };
        }

        if (parameter.required) {
          return { parameter, value: null };
        }

        return null;
      })
      .filter(Boolean) as Array<{
      parameter: VariableParameterDefinition;
      value: VariableParameterValue | null;
    }>;

    if (!parts.length) {
      container.textContent = displayName;
      return;
    }

    parts.forEach((part, index) => {
      if (index > 0) {
        container.append(document.createTextNode(', '));
      }

      const segment = document.createElement('span');
      segment.className = 'variable-pill__arg';
      segment.append(document.createTextNode(`${part.parameter.key}=`));

      if (part.value === true) {
        segment.append(this.createInlineValueChip('true', 'manual'));
      } else if (isVariableParameterReference(part.value)) {
        const item = this.findVariableItem(part.value.variableId);
        segment.append(
          this.createInlineValueChip(
            part.value.displayName,
            'variable',
            item ?? undefined,
          ),
        );
      } else if (typeof part.value === 'string') {
        segment.append(this.createInlineValueChip(part.value, 'manual'));
      } else {
        segment.append(this.createInlineValueChip('value', 'placeholder'));
      }

      container.append(segment);
    });

    container.append(document.createTextNode(')'));
  }

  private createInlineValueChip(
    label: string,
    kind: 'manual' | 'placeholder' | 'variable',
    item?: VariableSuggestionItem,
  ) {
    const chip = document.createElement('span');
    chip.className = `variable-pill__inline-chip variable-pill__inline-chip--${kind}`;

    if (kind === 'variable' && item) {
      chip.classList.add('variable-pill__inline-chip--pill');
      chip.style.backgroundColor = item.groupColor;
      chip.style.color = item.groupTextColor;

      const icon = document.createElement('span');
      icon.className = 'variable-pill__inline-chip-icon';
      renderIconInto(icon, item.groupIcon);

      const text = document.createElement('span');
      text.textContent = label;

      chip.append(icon, ' ', text);
      return chip;
    }

    chip.textContent = kind === 'manual' ? `"${label}"` : label;
    return chip;
  }

  private createParameterValueEditor(
    parameter: VariableParameterDefinition,
    currentValue: VariableParameterValue | undefined,
    parameterValues: VariableParameterValues,
  ) {
    const wrapper = document.createElement('span');
    wrapper.className = 'variable-pill-field__value-wrap';

    const input = document.createElement('input');
    input.className = 'variable-pill-field__input';
    input.type = parameter.type === 'number' ? 'number' : 'text';
    input.inputMode = parameter.type === 'number' ? 'numeric' : 'text';
    input.placeholder = parameter.required ? 'Enter a value' : 'Leave blank';
    input.onclick = (event) => {
      event.stopPropagation();
    };
    input.onfocus = (event) => {
      event.stopPropagation();
    };
    input.onmousedown = (event) => {
      event.stopPropagation();
    };
    input.onkeydown = (event) => {
      event.stopPropagation();

      if (event.key === 'Enter') {
        input.blur();
      }
    };

    const seedInputValue = (value: VariableParameterValue | undefined) => {
      if (isVariableParameterReference(value)) {
        input.value = value.displayName;
        input.dataset.variableId = value.variableId;
        input.dataset.variableDisplayName = value.displayName;
        return;
      }

      input.value = typeof value === 'string' ? value : '';
      delete input.dataset.variableId;
      delete input.dataset.variableDisplayName;
    };

    const commitValue = () => {
      const nextValue = input.value;
      const nextValues = { ...parameterValues };

      if (nextValue.trim()) {
        if (
          input.dataset.variableId &&
          input.dataset.variableDisplayName === nextValue
        ) {
          nextValues[parameter.key] = {
            displayName: nextValue,
            type: 'variable',
            variableId: input.dataset.variableId,
          };
        } else {
          nextValues[parameter.key] = nextValue;
        }
      } else {
        delete nextValues[parameter.key];
      }

      queueMicrotask(() =>
        this.updateAttributes({
          parameterValues: nextValues,
        }),
      );
    };

    const showInput = () => {
      wrapper.replaceChildren(input);
      seedInputValue(currentValue);
      window.requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    };

    const showPreview = () => {
      const preview = document.createElement('button');
      preview.className = 'variable-pill-field__value-preview';
      preview.type = 'button';
      preview.onmousedown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        showInput();
      };

      if (isVariableParameterReference(currentValue)) {
        const item = this.findVariableItem(currentValue.variableId);
        preview.append(
          this.createInlineValueChip(
            currentValue.displayName,
            'variable',
            item ?? undefined,
          ),
        );
      } else if (typeof currentValue === 'string' && currentValue.trim()) {
        preview.append(this.createInlineValueChip(currentValue, 'manual'));
      }

      wrapper.replaceChildren(preview);
    };

    input.onblur = () => {
      commitValue();
    };

    this.panelCleanupCallbacks.push(this.attachInputVariableSuggestions(input));

    if (
      isVariableParameterReference(currentValue) ||
      (typeof currentValue === 'string' && currentValue.trim())
    ) {
      showPreview();
    } else {
      seedInputValue(currentValue);
      wrapper.append(input);
    }

    return wrapper;
  }

  private findVariableItem(variableId: string) {
    return (
      this.getItems().find((item) => item.variableId === variableId) ?? null
    );
  }

  private attachInputVariableSuggestions(input: HTMLInputElement) {
    let popup: TippyInstance | null = null;
    let listView: SuggestionListView | null = null;

    const destroyMenu = () => {
      popup?.destroy();
      popup = null;
      listView?.destroy();
      listView = null;
    };

    const openMenu = (match: InputSuggestionMatch) => {
      const items = getFilteredVariableItems(this.getItems, match.query);
      const applySelection = (item: VariableSuggestionItem) => {
        const nextValue = replaceInputSuggestionToken(input.value, match, item);
        input.value = nextValue;
        input.dataset.variableId = item.variableId;
        input.dataset.variableDisplayName = item.displayName;
        const caret = match.from + item.displayName.length;
        input.setSelectionRange(caret, caret);
        destroyMenu();
        input.focus();
      };

      if (!listView) {
        listView = new SuggestionListView({
          items,
          command: applySelection,
        });
        popup = tippy(document.body, {
          appendTo: () => document.body,
          content: listView.element,
          getReferenceClientRect: () => input.getBoundingClientRect(),
          interactive: true,
          placement: 'bottom-start',
          showOnCreate: true,
          trigger: 'manual',
        });
        return;
      }

      listView.update({
        items,
        command: applySelection,
      });
      popup?.setProps({
        getReferenceClientRect: () => input.getBoundingClientRect(),
      });
      popup?.show();
    };

    const refreshMenu = () => {
      const match = getInputSuggestionMatch(input);

      if (!match) {
        destroyMenu();
        return;
      }

      openMenu(match);
    };

    const handleInput = () => {
      if (
        input.dataset.variableDisplayName &&
        input.value !== input.dataset.variableDisplayName
      ) {
        delete input.dataset.variableId;
        delete input.dataset.variableDisplayName;
      }

      refreshMenu();
    };

    const handleFocus = () => {
      refreshMenu();
    };

    const handleBlur = () => {
      window.setTimeout(() => {
        if (document.activeElement !== input) {
          destroyMenu();
        }
      }, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!listView) {
        return;
      }

      if (event.key === 'Escape') {
        destroyMenu();
        return;
      }

      const handled = listView.onKeyDown({
        event,
        range: { from: 0, to: 0 },
        view: this.props.view,
      });

      if (handled) {
        event.preventDefault();
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);

    return () => {
      destroyMenu();
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleKeyDown);
    };
  }
}

export function createVariablePillExtension(
  getItems: () => VariableSuggestionItem[],
) {
  return TipTapNode.create({
    name: 'variablePill',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
      return {
        variableId: { default: '' },
        displayName: { default: '' },
        description: { default: '' },
        tooltip: { default: '' },
        groupColor: { default: '#E7EEF8' },
        groupTextColor: { default: '#214768' },
        groupIcon: { default: '{}' },
        parameters: { default: [] },
        parameterValues: { default: {} },
      };
    },

    parseHTML() {
      return [{ tag: 'span[data-variable-pill]' }];
    },

    renderHTML({ HTMLAttributes }) {
      const attrs = HTMLAttributes as Record<string, string>;
      const parameters =
        (HTMLAttributes.parameters as
          | VariableParameterDefinition[]
          | undefined) ?? [];
      const parameterValues =
        (HTMLAttributes.parameterValues as
          | VariableParameterValues
          | undefined) ?? {};
      const pillLabel = formatVariableInvocation(
        attrs.displayName ?? '',
        parameters,
        parameterValues,
        {
          includeOptionalEmpty: false,
          preferPlaceholderNames: true,
        },
      );

      return [
        'span',
        mergeAttributes({
          'data-variable-pill': 'true',
          class: 'variable-pill',
          title: attrs.tooltip,
          style: `--pill-bg:${attrs.groupColor};--pill-fg:${attrs.groupTextColor};`,
        }),
        [
          'span',
          { class: 'variable-pill__icon', 'aria-hidden': 'true' },
          iconLabel(attrs.groupIcon),
        ],
        ['span', { class: 'variable-pill__label' }, pillLabel],
      ];
    },

    addNodeView() {
      return (props) => new VariablePillNodeView(props, getItems);
    },

    addProseMirrorPlugins() {
      const editor = this.editor;

      return [
        Suggestion({
          editor,
          char: '/',
          allowSpaces: true,
          items: ({ query }) => {
            const normalizedQuery = query.trim().toLowerCase();
            const options = getItems();

            if (!normalizedQuery) {
              return options.slice(0, 30);
            }

            return options
              .filter((item) => {
                const haystack =
                  `${item.displayName} ${item.description}`.toLowerCase();
                return haystack.includes(normalizedQuery);
              })
              .slice(0, 30);
          },
          command: ({ editor: currentEditor, range, props }) => {
            currentEditor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: this.name,
                  attrs: {
                    ...props,
                    parameterValues: {},
                  },
                },
                { type: 'text', text: ' ' },
              ])
              .run();
          },
          render: () => {
            let popup: TippyInstance | null = null;
            let listView: SuggestionListView | null = null;

            return {
              onStart: (props: SuggestionProps<VariableSuggestionItem>) => {
                listView = new SuggestionListView({
                  items: props.items,
                  command: props.command,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy(document.body, {
                  appendTo: () => document.body,
                  content: listView.element,
                  getReferenceClientRect: () =>
                    props.clientRect?.() ?? new DOMRect(),
                  interactive: true,
                  placement: 'bottom-start',
                  showOnCreate: true,
                  trigger: 'manual',
                });
              },

              onUpdate(props: SuggestionProps<VariableSuggestionItem>) {
                listView?.update({
                  items: props.items,
                  command: props.command,
                });

                if (!props.clientRect) {
                  return;
                }

                popup?.setProps({
                  getReferenceClientRect: () =>
                    props.clientRect?.() ?? new DOMRect(),
                });
              },

              onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === 'Escape') {
                  popup?.hide();
                  return true;
                }

                return listView?.onKeyDown(props) ?? false;
              },

              onExit() {
                popup?.destroy();
                popup = null;
                listView?.destroy();
                listView = null;
              },
            };
          },
        }),
      ];
    },
  });
}

function getInputSuggestionMatch(
  input: HTMLInputElement,
): InputSuggestionMatch | null {
  const caret = input.selectionStart ?? input.value.length;
  const prefix = input.value.slice(0, caret);
  const match = prefix.match(/(^|\s)\/([^\s/]*)$/);

  if (!match) {
    return null;
  }

  const query = match[2] ?? '';
  const from = prefix.lastIndexOf('/');

  return {
    from,
    query,
    to: caret,
  };
}

function getFilteredVariableItems(
  getItems: () => VariableSuggestionItem[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const options = getItems();

  if (!normalizedQuery) {
    return options.slice(0, 30);
  }

  return options
    .filter((item) => {
      const haystack = `${item.displayName} ${item.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 30);
}

function replaceInputSuggestionToken(
  value: string,
  match: InputSuggestionMatch,
  item: VariableSuggestionItem,
) {
  return `${value.slice(0, match.from)}${item.displayName}${value.slice(match.to)}`;
}

function renderIconInto(container: HTMLElement, iconName: string) {
  container.replaceChildren();

  const svg = createIconSvg(iconName);

  if (!svg) {
    container.textContent = iconLabel(iconName);
    return;
  }

  container.append(svg);
}

function createIconSvg(iconName: string) {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const iconPaths = iconPathMap[iconName];

  if (!iconPaths) {
    return null;
  }

  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('variable-pill__icon-svg');

  iconPaths.forEach((pathData) => {
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });

  return svg;
}

function iconLabel(iconName: unknown) {
  if (typeof iconName !== 'string') {
    return '{}';
  }

  return iconName;
}

const iconPathMap: Record<string, string[]> = {
  Braces: ['M9 18c-2 0-3-1-3-3v-1c0-1.1-.9-2-2-2 1.1 0 2-.9 2-2V9c0-2 1-3 3-3', 'M15 6c2 0 3 1 3 3v1c0 1.1.9 2 2 2-1.1 0-2 .9-2 2v1c0 2-1 3-3 3'],
  Search: ['m21 21-4.34-4.34', 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16'],
  Hammer: ['m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9', 'm17.64 15 1.67-1.67a2.12 2.12 0 0 0 0-3L15 6', 'm14 7 3 3', 'm5 6 4-4', 'm19 14 4-4'],
  FolderTree: ['M20 10a2 2 0 0 0-2-2h-5l-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4', 'M14 14h6', 'M17 11v6'],
  Sparkles: ['M9.94 15.06 8.5 18.5 5.06 19.94 8.5 21.38 9.94 24.82 11.38 21.38 14.82 19.94 11.38 18.5 9.94 15.06'.replace(/24\.82|21\.38/g, (m) => (m === '24.82' ? '22' : '19')),'M19 3l1.5 3L23 7.5 20.5 9 19 12l-1.5-3L15 7.5 17.5 6 19 3','M4 3l.5 1.5L6 5l-1.5.5L4 7l-.5-1.5L2 5l1.5-.5L4 3'],
  Blocks: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  Database: ['M12 3C7 3 3 4.79 3 7s4 4 9 4 9-1.79 9-4-4-4-9-4Z', 'M3 7v5c0 2.21 4 4 9 4s9-1.79 9-4V7', 'M3 12v5c0 2.21 4 4 9 4s9-1.79 9-4v-5'],
  WandSparkles: ['m21.64 3.64-1.28-1.28a1.5 1.5 0 0 0-2.12 0L4 16.6V20h3.4L21.64 5.76a1.5 1.5 0 0 0 0-2.12', 'M14.5 4.5 19.5 9.5', 'M12 2v2', 'M5 9H3', 'M5 5 4 4', 'M19 15h2', 'M19 19l1 1'],
};

function isVariableParameterReference(
  value: unknown,
): value is VariableParameterReference {
  const candidate = value as Record<string, unknown> | null;

  return (
    typeof value === 'object' &&
    value !== null &&
    candidate?.type === 'variable' &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.variableId === 'string'
  );
}

function formatVariableInvocation(
  displayName: string,
  parameters: VariableParameterDefinition[],
  parameterValues: VariableParameterValues,
  options?: {
    includeOptionalEmpty?: boolean;
    preferPlaceholderNames?: boolean;
  },
) {
  if (!parameters.length) {
    return displayName;
  }

  const parts = parameters
    .map((parameter) => {
      const rawValue = parameterValues[parameter.key];
      const hasStringValue =
        typeof rawValue === 'string' && rawValue.trim().length > 0;
      const hasBooleanValue = typeof rawValue === 'boolean';
      const hasVariableReference = isVariableParameterReference(rawValue);

      if (hasBooleanValue) {
        return rawValue ? `${parameter.key}=true` : '';
      }

      if (hasVariableReference) {
        return `${parameter.key}=${rawValue.displayName}`;
      }

      if (hasStringValue) {
        return options?.preferPlaceholderNames
          ? `${parameter.key}=${String(rawValue).trim()}`
          : String(rawValue).trim();
      }

      if (parameter.required || options?.includeOptionalEmpty) {
        return parameter.key;
      }

      return '';
    })
    .filter(Boolean);

  return parts.length ? `${displayName}(${parts.join(', ')})` : displayName;
}
