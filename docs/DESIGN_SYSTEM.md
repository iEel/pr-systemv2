# Design System

This file documents the implemented Phase 1 UI rules. The broader creative direction lives in [../DESIGN.md](../DESIGN.md).

## Visual Direction

The interface should feel like a modern premium enterprise document console:

- Deep navy app shell.
- White work surfaces.
- Cool slate background.
- Dense but calm operational layouts.
- Clear status language for controlled documents.

Avoid old government-form styling: no cramped boxes, stale gray-heavy form walls, or visually noisy borders.

## Implemented CSS Tokens

Defined in `app/globals.css` and mapped in `tailwind.config.ts`.

| Token | Use |
| --- | --- |
| `--shell` | Sidebar and main navigation frame. |
| `--panel` | White content surfaces. |
| `--surface` | App background. |
| `--ink` | Primary text. |
| `--muted` | Secondary text. |
| `--border` | Dividers, form borders, table separators. |
| `--primary` | Primary actions, links, active emphasis. |
| `--info` | Generated/info states. |
| `--success` | Signed/success states. |
| `--warning` | Printed/waiting states. |
| `--danger` | Cancelled/error states. |

Implemented shadows:

- `shadow-panel`
- `shadow-popover`

## Typography

The current font stack:

```css
"Segoe UI", "Noto Sans Thai", "Leelawadee UI", system-ui, sans-serif
```

Rules:

- Support mixed Thai and English labels.
- Keep headings compact inside operational panels.
- Do not use viewport-scaled font sizes.
- Keep letter spacing neutral except small uppercase metadata labels.

## Layout Rules

- Main shell uses a sticky full-height sidebar on desktop and a fixed drawer on mobile.
- Sidebar navigation scrolls internally when menu content exceeds the viewport; page content scroll should not move the desktop shell.
- Page content is constrained with `max-w-[1500px]`.
- Dense tables use internal horizontal scroll instead of page-level overflow.
- Detail and form pages use a main column plus a sticky side summary on wide screens.
- Cards are for real panels and repeated items only, with tight radius.

## Components

### Buttons

- Use icon plus text for primary workflow commands.
- Primary button uses navy/blue fill.
- Secondary button uses white background and border.
- Destructive actions should use semantic danger styling when implemented.

### Badges

Status badges map through `lib/status.ts`.

| Status | Tone |
| --- | --- |
| `Draft` | neutral |
| `Generated` | info |
| `Printed` | warning |
| `Signed` | success |
| `Cancelled` | danger |
| `Reissued` | purple |

### Forms

- Labels must stay visible.
- Required fields should be explicit.
- Field groups should follow document logic: company, dates, department, purpose, method, items, remark, summary.
- Backend validation errors should appear near the field and in a summary when needed.

### Tables

- Headers use compact muted styling.
- Important identifiers such as PR number are links.
- Operational tables may use a minimum width and internal scroll.
- Empty states should explain what changed and what the user can do next.

### Upload Zones

- Use dashed drop zone only for file upload.
- Show accepted file types.
- Show selected file name.
- Show readable error states.
- Signed uploads must explain versioning.

## Accessibility Rules

- Preserve the skip link.
- Keep `:focus-visible` styles visible.
- Do not communicate status by color alone.
- Respect `prefers-reduced-motion`.
- Ensure mobile drawer can be opened, closed, and navigated by keyboard.
- Keep Thai text from clipping in buttons, labels, badges, and table cells.
