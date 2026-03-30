# Prompt Tool PRD

Status: Draft  
Last updated: 2026-03-25  
Owner: Product / Design / Engineering

## 1. Summary

Prompt Tool is a structured authoring workspace for people who write prompts, build plans, and system notes that need to reference real tool or API metadata. Instead of copying values out of raw JSON by hand, users paste one or more JSON payloads, map relevant items into reusable variable groups, and compose a rich markdown document with inline variable pills that can carry parameters.

The product's current strength is turning raw structured data into an author-friendly prompt canvas. The v1 opportunity is to make that workflow dependable, legible, and exportable without adding backend or collaboration complexity.

## 2. Problem

Teams building AI workflows often write prompts and implementation plans while looking at raw JSON payloads, tool definitions, or schema-like data. This leads to a few recurring problems:

- Authors copy names and descriptions manually, which creates errors and stale references.
- Raw payloads are hard to scan, so turning them into a usable prompt structure is slow.
- Reusable variables are not clearly organized, especially when a document mixes tools, search actions, retrieval steps, and custom instructions.
- Parameterized tool calls are difficult to express consistently in plain text.
- Final prompt documents need to leave the tool as clean markdown, not remain trapped in a proprietary editor.

## 3. Product Vision

Create the fastest way to go from raw structured payloads to a clean, reusable prompt draft.

Prompt Tool should feel like a lightweight local workspace where users can:

- ingest real JSON,
- extract and organize meaningful variables,
- write with those variables naturally inside a document,
- export the result as portable markdown.

## 4. Goals

### Primary goals

- Reduce the time it takes to turn raw JSON into a structured prompt draft.
- Reduce authoring mistakes caused by manual copy/paste of variable names and tool details.
- Make variable-backed prompt writing feel as fluid as normal document editing.
- Preserve traceability from authored content back to the source payload.
- Keep the output portable through markdown copy/download.

### Secondary goals

- Support both mapped variables from JSON and manually created custom variables.
- Make grouped variables understandable at a glance through color, icon, and naming.
- Keep the product local-first and simple to operate without setup.

## 5. Non-Goals

The following are out of scope for v1:

- Executing prompts against an LLM
- Calling tools or APIs directly from the app
- Team collaboration or multi-user editing
- Cloud sync, authentication, or backend storage
- Version history and branching
- Automatic schema fetching from remote URLs
- Full document templating marketplace
- Advanced analytics infrastructure

## 6. Target Users

### Primary users

- Prompt engineers creating system prompts and reusable prompt specs
- Product engineers building agent workflows from tool/API payloads
- AI prototypers turning JSON tool metadata into build plans and implementation notes

### Secondary users

- Designers or PMs documenting agent capabilities in a structured way
- Technical writers capturing tool behaviors as markdown deliverables

## 7. Jobs To Be Done

- When I have a raw JSON payload, I want to turn it into reusable prompt variables so I can write against real data instead of copying by hand.
- When I am drafting a system prompt or build plan, I want to insert mapped variables quickly so I can stay in writing flow.
- When a variable accepts inputs, I want to define or fill those parameters inline so the exported markdown remains concrete and usable.
- When I finish a draft, I want clean markdown output so I can move it into other tools without reformatting.

## 8. User Value Proposition

Prompt Tool helps users move from "messy payload inspection" to "structured prompt authoring" in one workspace. It combines a data mapping surface with a writing canvas, so users do not need to bounce between raw JSON, scratch notes, and a separate editor.

## 9. Current Product Shape

This PRD is based on the active app implementation in `src/` and intentionally excludes `prompt-tool-temp` and `prompt-tool-ux`.

The current product already supports:

- multiple pasted JSON sources,
- a JSON tree for source inspection,
- drag-and-drop mapping of supported array items into variable groups,
- group creation with names, colors, and icons,
- custom variables with optional/required parameters,
- a rich editor with inline variable pills,
- slash-triggered variable insertion,
- inline parameter entry on selected pills,
- usage/reference tracking for inserted variables,
- local persistence in browser storage,
- markdown copy and markdown file download.

## 10. Core User Flow

1. User opens Prompt Tool.
2. User pastes one or more JSON payloads and labels them.
3. User reviews the JSON tree and identifies relevant array items.
4. User drags items into semantic groups such as "Core variables", "Search tools", or "Retrieval actions".
5. User optionally creates custom variables that do not exist in the JSON.
6. User switches to the editor canvas.
7. User writes a prompt document and inserts variables by click or slash command.
8. User fills parameter values for any inserted variable pill as needed.
9. User reviews variable usage and jumps to references where needed.
10. User copies or downloads the final markdown.

## 11. Functional Requirements

### A. Workspace and state

- FR1: The app must load into a single local workspace with no sign-in required.
- FR2: The app must persist document title, editor content, sources, groups, and mapped variables locally between sessions.
- FR3: The app must restore the last usable state on reload and fall back safely if stored data is invalid.

### B. Source ingestion

- FR4: Users must be able to add a JSON source by pasting raw JSON into a form.
- FR5: Users must be able to optionally label each source.
- FR6: Invalid JSON must be rejected with a clear inline error and must not overwrite prior state.
- FR7: Users must be able to switch between multiple sources.

### C. Source inspection and mapping

- FR8: Each source must be displayed as a readable JSON tree.
- FR9: Supported array items should appear as mapping candidates with name, description, and detected parameters when available.
- FR10: Dragging a supported item onto a group must create a mapped variable linked to the source path.
- FR11: The system must preserve traceability metadata for mapped variables, including source identity and key path.
- FR12: Already mapped source items should no longer appear as available mapping candidates.
- FR13: The system should prevent accidental duplicate mappings within a group and provide feedback when a duplicate is attempted.

### D. Variable groups

- FR14: Users must be able to create variable groups.
- FR15: Each group must support a user-defined name plus a visual color/icon identity.
- FR16: Users must be able to rename groups inline.
- FR17: Groups must act as drop targets for mapped variables.
- FR18: Each group must list its current variables with enough metadata to understand what each variable represents.

### E. Custom variables

- FR19: Users must be able to create custom variables manually inside a group.
- FR20: Custom variables must support a display name and description.
- FR21: Custom variables must support zero or more parameters.
- FR22: Each parameter must support a key, type, required flag, and description.

### F. Variable lifecycle

- FR23: Users must be able to remove mapped or custom variables from a group.
- FR24: Removing a variable must update its availability and usage state appropriately in the workspace.

### G. Prompt Editor

- FR25: Users must be able to author a document with a title and rich text body.
- FR26: The editor must support common block formatting needed for prompt specs, including headings, paragraphs, lists, blockquotes, and code blocks.
- FR27: Users must be able to insert variables from the sidebar with one click.
- FR28: Users must be able to insert variables from within the editor via slash-triggered suggestions.
- FR29: Variable suggestions must be searchable by variable name and description.

### H. Variable pills and parameters

- FR30: Inserted variables must render as distinct inline pills inside the editor.
- FR31: Each pill must retain the variable's display name, grouping metadata, and parameter schema.
- FR32: Selecting a pill must allow the user to view and edit parameter values inline.
- FR33: Boolean parameters must be editable as toggles.
- FR34: String and number parameters must be editable as text/number inputs.
- FR35: Required and optional parameters must be visually distinguishable.

### I. Reference awareness

- FR36: The system must track where each variable is used in the current document.
- FR37: Users must be able to inspect usage status for each variable.
- FR38: Users must be able to jump from a variable in the sidebar to each corresponding reference in the editor.

### J. Export

- FR39: Users must be able to copy the authored document as markdown to the clipboard.
- FR40: Users must be able to download the authored document as a `.md` file using the document title as the filename basis.
- FR41: Exported markdown must preserve the document structure and serialize variable pills in a readable inline invocation format.

## 12. UX Requirements

- UX1: The product should feel desktop-first and optimized for focused authoring sessions.
- UX2: The data-mapping view and editor view should remain clearly separated so users always know whether they are curating inputs or writing output.
- UX3: The app should make variables understandable without requiring users to reopen raw JSON constantly.
- UX4: Important actions such as parse, create group, add custom variable, copy, and download should be obvious and low-friction.
- UX5: Feedback for success and failure should be immediate and lightweight.
- UX6: Empty states should explain the next meaningful action.
- UX7: Visual grouping should help users reason about categories, not just decorate the interface.

## 13. Success Metrics

Because the current product is local-first, v1 success metrics should be defined first and instrumented later.

### User outcome metrics

- Time from first source paste to first mapped variable
- Time from first source paste to first exported markdown draft
- Number of variables mapped per session
- Number of exported documents per active user/session
- Ratio of mapped variables that are used at least once in the final document

### Quality metrics

- Rate of JSON parse failures
- Rate of duplicate mapping attempts
- Export success rate
- Frequency of users abandoning after source ingestion without mapping or authoring

## 14. Design Principles

- Real data first: prompt writing should begin from actual payloads, not invented placeholders.
- Structure without heaviness: the app should help users organize complexity without becoming a heavyweight CMS.
- Portability matters: markdown output is a core product promise, not an afterthought.
- Traceability builds trust: users should understand where a variable came from and where it is used.
- Authoring flow is sacred: mapping and insertion should reduce interruption, not create more modal overhead.

## 15. Technical and Product Constraints

- Local-first architecture is the default for v1.
- No backend dependency should be required for core authoring.
- Data persistence is currently browser-local and should remain simple unless a later phase introduces sync.
- The product is implemented as a Next.js web app with a client-side editor and browser storage.
- The current mapping model is strongest for JSON arrays containing object items with `name`, `description`, and optional `parameters`.

## 16. Risks

- The current mapping model may feel too narrow if users want to map deeper or differently shaped JSON.
- Local-only persistence increases simplicity but creates limits around sharing, backup, and multi-device continuity.
- Rich editor serialization can create edge cases if formatting or variable syntax evolves.
- Hiding already-mapped items may confuse users if they expect the same source item to appear in multiple groups.
- Parameter schemas inferred from JSON may vary in quality and consistency across sources.

## 17. Open Questions

- Should a single mapped source item be allowed in multiple groups, or should mapping remain globally unique?
- Should users be able to edit the display name of mapped variables without changing source traceability?
- Should the product support importing formats beyond raw JSON, such as OpenAPI snippets or JSON Schema?
- Should deeper nested arrays be mappable, or is shallow-array mapping the intended constraint?
- What inline markdown syntax should represent variables long-term if exported documents become machine-consumable?
- Is mobile support meant to be fully functional, or is laptop/desktop the intended primary environment?
- Should custom variables eventually support examples, default values, or validation rules?

## 18. Future Opportunities

These are intentionally out of scope for v1 but are strong follow-on opportunities:

- Remote source import from files or URLs
- Variable aliasing and manual remapping
- Document templates for common prompt structures
- Prompt preview or linting
- Shared workspaces and collaboration
- Version history and diffing
- Source refresh with re-mapping assistance
- Structured export modes beyond markdown

## 19. Release Criteria For V1

Prompt Tool v1 is ready when:

- a user can paste JSON, map variables, write a document, and export markdown end-to-end without help,
- the workspace survives refresh reliably,
- variable insertion and parameter editing work consistently,
- the main empty states and error states are understandable,
- the exported markdown is clean enough to use in downstream docs or prompt tooling.

## 20. Appendix: Suggested MVP Narrative

Prompt Tool is a local-first authoring app for turning real JSON payloads into reusable prompt variables. Users map source items into semantic groups, compose a document with inline variable pills, fill parameters as needed, and export a clean markdown draft. The product is best suited for prompt engineers and builders who want a faster, less error-prone bridge between raw structured data and production-ready prompt documentation.
