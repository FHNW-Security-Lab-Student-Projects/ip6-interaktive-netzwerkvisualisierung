# Right-Click Context Menu for Compound Nodes

## Summary

Add a right-click context menu to compound nodes (both collapsed and expanded) that offers two actions: **Expand all** (recursively expand the entire subtree) and **Collapse** (collapse the node and all its descendants). Both actions are always shown regardless of the node's current state, since hybrid structures (some children expanded, some collapsed) make a single toggle ambiguous.

## Trigger & Scope

- Event: Cytoscape's `cxttap` on any node that is `.collapsed` or `:parent`
- Leaf nodes (hosts, unknown devices) do not receive the menu
- The native browser context menu remains suppressed (already handled by `contextmenu` → `preventDefault`)

## Menu UI

A `<div class="ctx-menu">` is appended to `cy.container()` (not `document.body`) so it stays within the canvas bounds. It contains two `<button>` elements:

1. **Expand all** — expands this compound and all expandable descendants
2. **Collapse** — collapses this compound and all its descendants

The menu is positioned at the event's rendered position (`event.renderedPosition`), clamped to stay within the container boundaries so it never overflows off-screen.

## Dismiss Behaviour

The menu closes on:
- Click on either menu item (after the action runs)
- Click anywhere outside the menu
- `Escape` key
- A new `cxttap` event (replaces the current menu with a fresh one)

A single `closeMenu()` helper handles all cases and removes the DOM element and its event listeners.

## Recursive Expand Logic

New internal function `doExpandAll(node)`:

```
doExpand(node)
loop:
  collapsed = node.descendants('.collapsed')
  if collapsed is empty → stop
  for each collapsed descendant → doExpand(it)
```

This reuses the existing `doExpand` function (which handles position restoration and edge sync) and iterates until no collapsed descendants remain, regardless of `savedExpanded` state.

## Layout After Action

- **Expand all**: calls `runExpandCollapseLayout` with the target node as anchor — same as the existing double-click expand path
- **Collapse**: calls `doCollapse` then `runExpandCollapseLayout` — same as existing double-click collapse path

## CSS

New `.ctx-menu` styles in `style.css`:
- `position: absolute`, `z-index` above canvas
- Small box shadow, `border-radius: 6px`, white background
- Buttons: full-width, plain text, hover highlight matching the existing toolbar palette (`#f0f4ff` background, `#3a6ea5` text on hover)

## Implementation Location

All logic in `expand-collapse.ts`. CSS additions in `style.css`. No new files, no new dependencies.
